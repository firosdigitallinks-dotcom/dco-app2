import type { Metadata } from "next";
import type { SeoEntry } from "../db/site";

export type SiteSettingsRecord = Record<string, string>;

function cleanSnippet(value: string) {
  let decoded = value;
  // Imported CMS metadata can contain one or two layers of HTML escaping.
  // Decode the small entity set that is valid in plain-text metadata fields.
  for (let pass = 0; pass < 2; pass += 1) {
    decoded = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#(?:39|x27);/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }
  return decoded.replace(/\s+/g, " ").trim();
}

function truncateSnippet(value: string, maxLength: number) {
  const cleaned = cleanSnippet(value);
  if (cleaned.length <= maxLength) return cleaned;
  const candidate = cleaned.slice(0, maxLength - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const cutAt = lastSpace > maxLength * 0.7 ? lastSpace : candidate.length;
  return `${candidate.slice(0, cutAt).trim()}…`;
}

function optimizedTitle(
  value: string,
  siteName: string,
  uniqueQualifier?: string,
) {
  let title = cleanSnippet(value) || siteName;
  if (
    title.length < 15 &&
    !title.toLowerCase().includes(siteName.toLowerCase())
  ) {
    title = `${title} | ${siteName}`;
  }

  const qualifier = cleanSnippet(uniqueQualifier || "");
  if (qualifier && !title.toLowerCase().includes(qualifier.toLowerCase())) {
    const siteSuffix = ` | ${siteName}`;
    const hasSiteSuffix = title.endsWith(siteSuffix);
    const baseTitle = hasSiteSuffix
      ? title.slice(0, -siteSuffix.length).trim()
      : title;
    const suffix = ` – ${qualifier}${hasSiteSuffix ? siteSuffix : ""}`;
    title = `${truncateSnippet(baseTitle, Math.max(20, 64 - suffix.length))}${suffix}`;
  }

  return truncateSnippet(title, 64);
}

function optimizedDescription(value: string, siteName: string) {
  let description = cleanSnippet(value);
  if (description.length < 50) {
    const context = `Explore professional cleaning chemicals, tissue products, tools, washroom supplies, and facility essentials from Hygiene Links across the UAE, Oman, and Qatar.`;
    description = description ? `${description}. ${context}` : context;
  }
  return truncateSnippet(description, 165);
}

export function stripHtmlExtension(value: string) {
  return value.endsWith(".html") ? value.slice(0, -5) : value;
}

export function siteBaseUrl(
  settings: SiteSettingsRecord,
  fallback = process.env.NEXT_PUBLIC_SITE_URL || "https://hygienelinksupplies.com",
) {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim() || settings.site_url?.trim() || fallback;
  try {
    const url = new URL(candidate);
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(fallback);
  }
}

export function absoluteUrl(
  settings: SiteSettingsRecord,
  path: string,
  fallback?: string,
) {
  const base = siteBaseUrl(settings, fallback);
  const basePathPrefix = (
    process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  ).replace(/^\/|\/$/g, "");
  let cleanPath = (path || "/").trim();
  if (basePathPrefix && !cleanPath.startsWith(`/${basePathPrefix}`)) {
    cleanPath = `/${basePathPrefix}${cleanPath === "/" ? "" : cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
  }
  return new URL(cleanPath, base).toString();
}

export function buildPageMetadata({
  settings,
  entry,
  fallbackTitle,
  fallbackDescription,
  canonicalPath,
  image,
  index = true,
  uniqueTitleQualifier,
}: {
  settings: SiteSettingsRecord;
  entry?: SeoEntry;
  fallbackTitle: string;
  fallbackDescription: string;
  canonicalPath: string;
  image?: string;
  index?: boolean;
  uniqueTitleQualifier?: string;
}): Metadata {
  const siteName = settings.site_name || "Hygiene Links";
  const title = optimizedTitle(
    entry?.metaTitle?.trim() ||
      fallbackTitle ||
      settings.default_meta_title ||
      siteName,
    siteName,
    uniqueTitleQualifier,
  );
  const description = optimizedDescription(
    entry?.metaDescription?.trim() ||
      fallbackDescription ||
      settings.default_meta_description ||
      "",
    siteName,
  );
  const canonical = absoluteUrl(
    settings,
    entry?.canonicalPath?.trim() || canonicalPath,
  );
  const imageUrl = absoluteUrl(
    settings,
    image || settings.default_og_image || "/og.png",
  );
  const allowIndex =
    index &&
    settings.robots_index !== "false" &&
    (entry?.robotsIndex ?? true);
  const socialTitle = entry?.ogTitle?.trim()
    ? optimizedTitle(entry.ogTitle, siteName, uniqueTitleQualifier)
    : title;
  const socialDescription = entry?.ogDescription?.trim()
    ? optimizedDescription(entry.ogDescription, siteName)
    : description;
  const keywords = (entry?.keywords || settings.default_keywords || "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical },
    robots: {
      index: allowIndex,
      follow: allowIndex,
      googleBot: {
        index: allowIndex,
        follow: allowIndex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: settings.site_name || "Hygiene Links",
      title: socialTitle,
      description: socialDescription,
      url: canonical,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [imageUrl],
    },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
