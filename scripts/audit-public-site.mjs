const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:3100");
const concurrency = Math.max(1, Math.min(12, Number(process.env.AUDIT_CONCURRENCY || 6)));

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attribute(html, tagExpression, name) {
  const tag = html.match(tagExpression)?.[0] || "";
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1]?.trim() || "";
}

function content(html, expression) {
  let value = html.match(expression)?.[1]?.replace(/<[^>]*>/g, " ") || "";
  for (let pass = 0; pass < 2; pass += 1) {
    value = value
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&#x27;", "'")
      .replaceAll("&nbsp;", " ")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">");
  }
  return value.replace(/\s+/g, " ").trim();
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "HygieneLinksTechnicalAudit/1.0", ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

const sitemapResponse = await fetchWithTimeout(new URL("/sitemap.xml", baseUrl));
if (!sitemapResponse.ok) {
  throw new Error(`Sitemap returned HTTP ${sitemapResponse.status}.`);
}

const sitemapXml = await sitemapResponse.text();
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
  decodeXml(match[1]),
);
const localUrls = sitemapUrls.map((value) => {
  const source = new URL(value);
  return new URL(`${source.pathname}${source.search}`, baseUrl).toString();
});

const pages = await mapConcurrent(localUrls, async (url) => {
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const title = content(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = attribute(
      html,
      /<meta\s+[^>]*name=["']description["'][^>]*>/i,
      "content",
    );
    const canonical = attribute(
      html,
      /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
      "href",
    );
    const ogTitle = attribute(
      html,
      /<meta\s+[^>]*property=["']og:title["'][^>]*>/i,
      "content",
    );
    const ogImage = attribute(
      html,
      /<meta\s+[^>]*property=["']og:image["'][^>]*>/i,
      "content",
    );
    const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
    const imagesWithoutAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter(
      ([tag]) => !/\salt=["'][^"']*["']/i.test(tag),
    ).length;
    const jsonLdErrors = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((value) => {
        try {
          JSON.parse(value);
          return false;
        } catch {
          return true;
        }
      }).length;

    return {
      url,
      status: response.status,
      title,
      description,
      canonical,
      ogTitle,
      ogImage,
      h1Count,
      imagesWithoutAlt,
      jsonLdErrors,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

const errors = [];
const warnings = [];
const titleOwners = new Map();
const canonicalOwners = new Map();

for (const page of pages) {
  if (page.status !== 200) errors.push(`${page.url}: HTTP ${page.status || page.error}`);
  if (!page.title) errors.push(`${page.url}: missing title`);
  if (!page.description) errors.push(`${page.url}: missing meta description`);
  if (!page.canonical) errors.push(`${page.url}: missing canonical URL`);
  if (!page.ogTitle || !page.ogImage) errors.push(`${page.url}: incomplete Open Graph metadata`);
  if (page.h1Count !== 1) errors.push(`${page.url}: expected one H1, found ${page.h1Count}`);
  if (page.imagesWithoutAlt) errors.push(`${page.url}: ${page.imagesWithoutAlt} image(s) missing alt`);
  if (page.jsonLdErrors) errors.push(`${page.url}: invalid JSON-LD block`);

  if (page.title && (page.title.length < 15 || page.title.length > 65)) {
    warnings.push(`${page.url}: title length ${page.title.length}`);
  }
  if (
    page.description &&
    (page.description.length < 50 || page.description.length > 170)
  ) {
    warnings.push(`${page.url}: description length ${page.description.length}`);
  }

  if (page.title) {
    const owners = titleOwners.get(page.title) || [];
    owners.push(page.url);
    titleOwners.set(page.title, owners);
  }
  if (page.canonical) {
    const owners = canonicalOwners.get(page.canonical) || [];
    owners.push(page.url);
    canonicalOwners.set(page.canonical, owners);
  }
}

for (const [title, owners] of titleOwners) {
  if (owners.length > 1) warnings.push(`Duplicate title (${owners.length}): ${title}`);
}
for (const [canonical, owners] of canonicalOwners) {
  if (owners.length > 1) errors.push(`Duplicate canonical (${owners.length}): ${canonical}`);
}

console.log(`Audited ${pages.length} sitemap pages at ${baseUrl.origin}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
if (errors.length) console.log(`\nErrors\n${errors.slice(0, 100).join("\n")}`);
if (warnings.length) console.log(`\nWarnings\n${warnings.slice(0, 100).join("\n")}`);
if (errors.length) process.exitCode = 1;
