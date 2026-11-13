import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const sourcePage = "https://www.hygienelinks.com/";
const outputDirectory = join(process.cwd(), "public", "client-logos", "imported");
const manifestPath = join(process.cwd(), "data", "imported-client-logos.json");

const response = await fetch(sourcePage, {
  headers: { "user-agent": "HygieneLinksCatalogImporter/1.0" },
});
if (!response.ok) {
  throw new Error(`Unable to load client page (${response.status})`);
}

const html = await response.text();
const omanHeading = html.search(/our clients\s*<span[^>]*>\s*Oman\s*<\/span>/i);
if (omanHeading < 0) throw new Error("The Oman client section was not found.");

function extractSources(fragment) {
  return [...fragment.matchAll(/<img[^>]+src=["']([^"']*\/clients\/[^"']+)["']/gi)]
    .map((match) => new URL(match[1].replaceAll(" ", "%20"), sourcePage).toString())
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

const uaeSources = extractSources(html.slice(0, omanHeading));
const omanSources = extractSources(html.slice(omanHeading));

// The legacy page publishes the Petron logo twice in two JPEG encodings.
// Keep one visible logo while importing every distinct client entry.
const sources = [
  ...uaeSources
    .filter(
      (url) =>
        !decodeURIComponent(new URL(url).pathname).endsWith(
          "/assets/images/clients/uae (1).jpg",
        ),
    )
    .map((url) => ({ market: "UAE", url })),
  ...omanSources.map((url) => ({ market: "OMAN", url })),
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const knownNames = new Map([
  ["uae (1).jpeg", "Petron"],
  ["uae (2).jpg", "Al Shirawi FM"],
  ["uae (1).png", "NAFFCO"],
  ["uae (3).JPG", "Al Masa Contracting"],
  ["uae (4).jpg", "BurJuman"],
]);

async function download(item, index) {
  const originalName = decodeURIComponent(new URL(item.url).pathname.split("/").at(-1));
  const extension = extname(originalName).toLowerCase() || ".png";
  const marketIndex =
    sources.slice(0, index + 1).filter((source) => source.market === item.market).length;
  const localName = `${item.market.toLowerCase()}-${String(marketIndex).padStart(3, "0")}${extension}`;
  const imageResponse = await fetch(item.url, {
    headers: { "user-agent": "HygieneLinksCatalogImporter/1.0" },
  });
  if (!imageResponse.ok) {
    throw new Error(`Unable to download ${item.url} (${imageResponse.status})`);
  }
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  await writeFile(join(outputDirectory, localName), bytes);
  const fallbackName = `${item.market === "UAE" ? "UAE" : "Oman"} Client ${String(marketIndex).padStart(2, "0")}`;
  return {
    id: `imported-client-${item.market.toLowerCase()}-${String(marketIndex).padStart(3, "0")}`,
    name: knownNames.get(originalName) || fallbackName,
    imageUrl: `/client-logos/imported/${localName}`,
    websiteUrl: "",
    market: item.market,
    published: true,
    sortOrder: index + 1,
    sourceUrl: item.url,
  };
}

const clients = [];
const concurrency = 8;
for (let offset = 0; offset < sources.length; offset += concurrency) {
  const batch = sources.slice(offset, offset + concurrency);
  const results = await Promise.all(
    batch.map((item, batchIndex) => download(item, offset + batchIndex)),
  );
  clients.push(...results);
}

await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      version: "hygienelinks-public-clients-2026-08-05",
      source: sourcePage,
      importedAt: new Date().toISOString(),
      count: clients.length,
      clients,
    },
    null,
    2,
  )}\n`,
);

process.stdout.write(
  `Imported ${clients.length} client logos (${sources.filter((item) => item.market === "UAE").length} UAE, ${sources.filter((item) => item.market === "OMAN").length} Oman).\n`,
);
