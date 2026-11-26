import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, or } from "drizzle-orm";
import importedBlogsJson from "../data/imported-blogs.json";
import importedCatalog from "../data/imported-catalog.json";
import importedClientLogos from "../data/imported-client-logos.json";
import legacySeoMapping from "../data/legacy-seo-mapping.json";
import missingPageContentJson from "../data/missing-page-content.json";
import type { CatalogEditorialBlock } from "../lib/catalog-editorial";
import {
  legacyBlogPath,
  normalizeBlogSlug,
  sanitizeBlogAssetUrl,
  sanitizeBlogHtml,
  sanitizeBlogText,
} from "../lib/blog-content";
import { categoryUrl } from "../lib/category-url";
import { ensureMysqlSchema, getDb, withMysqlLock } from "./index";
import { additionalBlogPosts } from "./additional-blogs";
import {
  blogPosts,
  catalogEditorials,
  catalogImports,
  categories,
  clientLogos,
  contentBlocks,
  inquiries,
  products,
  seoEntries,
  siteSettings,
} from "./schema";

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type SeoEntry = typeof seoEntries.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type ClientLogo = typeof clientLogos.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type CatalogEditorial = typeof catalogEditorials.$inferSelect;

type ImportedBlogRecord = {
  id?: string;
  slug?: string;
  legacySlug?: string;
  sourceUrl?: string;
  sourceHash?: string;
  bodyHash?: string;
  title?: string;
  excerpt?: string;
  bodyHtml?: string;
  imageUrl?: string;
  featuredImageUrl?: string;
  imageAlt?: string;
  author?: string;
  category?: string;
  tags?: string | string[];
  publishedAt?: string | null;
  status?: string;
  featured?: boolean;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string | string[];
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
};

type ImportedBlogBundle = {
  version?: string;
  posts?: ImportedBlogRecord[];
};

type ImportedCatalogEditorialBundle = {
  pages?: Array<{
    type: "category" | "product";
    slug: string;
    blocks: CatalogEditorialBlock[];
  }>;
};

const importedBlogs = importedBlogsJson as ImportedBlogBundle;
const importedCatalogEditorials =
  missingPageContentJson as ImportedCatalogEditorialBundle;

function mergeKeywords(
  ...values: Array<string | readonly string[] | null | undefined>
) {
  const keywords: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const candidates =
      typeof value === "string" ? value.split(",") : value || [];
    for (const candidate of candidates) {
      const keyword = candidate.trim();
      const normalized = keyword.toLocaleLowerCase("en");
      if (!keyword || seen.has(normalized)) continue;
      seen.add(normalized);
      keywords.push(keyword);
    }
  }
  return keywords.join(", ");
}

function mappedKeywords(key: string, existing?: string) {
  const mapped =
    legacySeoMapping.keywords[
      key as keyof typeof legacySeoMapping.keywords
    ] || [];
  return mergeKeywords(existing, mapped);
}

function normalizeImportedDate(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  const dateOnly = candidate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    return year >= 1000 && year <= 9999 ? `${candidate} 00:00:00` : null;
  }

  const sqlDateTime = candidate.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (sqlDateTime) {
    const year = Number(sqlDateTime[1]);
    return year >= 1000 && year <= 9999
      ? `${sqlDateTime[1]}-${sqlDateTime[2]}-${sqlDateTime[3]} ${sqlDateTime[4]}:${sqlDateTime[5]}:${sqlDateTime[6]}`
      : null;
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.valueOf())) return null;
  const year = parsed.getUTCFullYear();
  return year >= 1000 && year <= 9999
    ? parsed.toISOString().slice(0, 19).replace("T", " ")
    : null;
}

function stringList(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";
}

const normalizedImportedBlogs = (importedBlogs.posts || [])
  .map((post, index) => {
    const legacySlug = normalizeBlogSlug(post.legacySlug || post.slug);
    const slug = normalizeBlogSlug(post.slug || legacySlug);
    const title = sanitizeBlogText(post.title, 500);
    if (!legacySlug || !slug || !title) return null;

    const bodyHtml = sanitizeBlogHtml(post.bodyHtml);
    const excerpt =
      sanitizeBlogText(post.excerpt, 1_000) || sanitizeBlogText(bodyHtml, 320);
    const id =
      sanitizeBlogText(post.id, 100) ||
      `blog-${createHash("sha256").update(legacySlug).digest("hex").slice(0, 32)}`;
    const sourceUrl =
      post.sourceUrl?.trim().slice(0, 512) ||
      `https://www.hygienelinks.com${legacyBlogPath(legacySlug)}`;
    const sourceHash =
      (post.sourceHash || post.bodyHash)?.trim().slice(0, 64) ||
      createHash("sha256").update(bodyHtml).digest("hex");
    const status = post.status === "draft" ? "draft" : "published";

    const row: typeof blogPosts.$inferInsert = {
      id,
      slug,
      legacySlug,
      sourceUrl,
      sourceHash,
      title,
      excerpt,
      bodyHtml,
      featuredImageUrl: sanitizeBlogAssetUrl(
        post.featuredImageUrl || post.imageUrl,
      ),
      imageAlt: sanitizeBlogText(post.imageAlt || title, 500),
      author: sanitizeBlogText(post.author || "Hygiene Links", 255),
      category: sanitizeBlogText(post.category || "Insights", 100),
      tags: stringList(post.tags || post.keywords),
      publishedAt: normalizeImportedDate(post.publishedAt),
      status,
      featured: Boolean(post.featured),
      sortOrder: Number.isFinite(post.sortOrder) ? Number(post.sortOrder) : index,
    };

    const metaTitle = sanitizeBlogText(post.metaTitle || title, 255);
    const metaDescription = sanitizeBlogText(
      post.metaDescription || excerpt,
      500,
    );
    const seo: typeof seoEntries.$inferInsert = {
      key: `blog:${id}`,
      entityType: "blog",
      entityId: id,
      label: title.slice(0, 255),
      metaTitle,
      metaDescription,
      keywords: stringList(post.keywords),
      canonicalPath: legacyBlogPath(legacySlug),
      ogTitle: sanitizeBlogText(post.ogTitle || metaTitle, 255),
      ogDescription: sanitizeBlogText(
        post.ogDescription || metaDescription,
        500,
      ),
      robotsIndex: status === "published",
    };

    return { row, seo };
  })
  .filter(
    (entry): entry is {
      row: typeof blogPosts.$inferInsert;
      seo: typeof seoEntries.$inferInsert;
    } => Boolean(entry),
  );

const seedBlogPosts = normalizedImportedBlogs.map((entry) => entry.row);
const seedBlogSeo = normalizedImportedBlogs.map((entry) => entry.seo);
const blogImportVersion = importedBlogs.version?.trim() || "";

const seedClientLogos: Array<typeof clientLogos.$inferInsert> =
  importedClientLogos.clients.map((client) => ({
    id: client.id,
    name: client.name,
    imageUrl: client.imageUrl,
    websiteUrl: client.websiteUrl,
    market: client.market,
    published: client.published,
    sortOrder: client.sortOrder,
  }));
const clientLogoImportVersion = importedClientLogos.version;
const legacyClientLogoIds = [
  "client-petron",
  "client-al-shirawi-fm",
  "client-naffco",
  "client-al-masa-contracting",
  "client-burjuman",
];
const socialProfileImportVersion = "footer-social-profiles-2026-08-05";
const initialSocialProfiles = [
  {
    key: "social_facebook",
    value: "https://www.facebook.com/hygienelinks/?ref=aymt_homepage_panel",
  },
  { key: "social_instagram", value: "https://www.instagram.com/hygiene_links/" },
  {
    key: "social_linkedin",
    value: "https://www.linkedin.com/company/hygiene-links/",
  },
  { key: "social_x", value: "https://twitter.com/hygiene_links" },
  {
    key: "social_youtube",
    value: "https://www.youtube.com/results?search_query=hygiene+links",
  },
] as const;

const importedCategories: Array<typeof categories.$inferInsert> =
  importedCatalog.categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    imageUrl: category.imageUrl,
    accent: category.accent,
    featured: category.featured,
    sortOrder: category.sortOrder,
  }));

const importedProducts: Array<typeof products.$inferInsert> =
  importedCatalog.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    summary: product.summary,
    description: product.description,
    imageUrl: product.imageUrl,
    packSize: product.packSize,
    applications: product.applications,
    featured: product.featured,
    eco: product.eco,
    status: "published",
    sortOrder: product.sortOrder,
  }));

const importedCategorySeo: Array<typeof seoEntries.$inferInsert> =
  importedCatalog.categories.map((category) => ({
    key: `category:${category.id}`,
    entityType: "category",
    entityId: category.id,
    label: category.name,
    metaTitle: category.name,
    metaDescription: category.description.slice(0, 500),
    keywords: mappedKeywords(`category:${category.slug}`),
    canonicalPath: categoryUrl(category.slug),
    robotsIndex: true,
  }));

const importedProductSeo: Array<typeof seoEntries.$inferInsert> =
  importedCatalog.products.map((product) => ({
    key: `product:${product.id}`,
    entityType: "product",
    entityId: product.id,
    label: product.name,
    metaTitle: product.metaTitle || product.name,
    metaDescription: product.metaDescription.slice(0, 500),
    keywords: mappedKeywords(`product:${product.slug}`),
    canonicalPath: `/product/${product.slug}.html`,
    robotsIndex: true,
  }));

const importedCategoryNames = new Map(
  importedCatalog.categories.map((category) => [category.slug, category.name]),
);
const importedProductNames = new Map(
  importedCatalog.products.map((product) => [product.slug, product.name]),
);
const seedCatalogEditorials: Array<typeof catalogEditorials.$inferInsert> =
  (importedCatalogEditorials.pages || []).map((page, index) => ({
    key: `${page.type}:${page.slug}`,
    pageType: page.type,
    slug: page.slug,
    label:
      (page.type === "category"
        ? importedCategoryNames.get(page.slug)
        : importedProductNames.get(page.slug)) || page.slug,
    blocksJson: JSON.stringify(page.blocks),
    sortOrder: index,
  }));
const catalogEditorialImportVersion =
  "catalog-editorials-hl-uae-content-2026-09-15-v1";
const keywordMappingImportVersion = legacySeoMapping.version;
const categoryCanonicalImportVersion =
  "category-canonical-legacy-seo-paths-2026-10-14-v1";
const windowWashersFaqImportVersion =
  "catalog-editorial-window-washers-faq-2026-10-16-v1";
const googleVerificationImportVersion =
  "google-site-verification-2026-10-17-v1";

const seoEntryKeyByMappedKey = new Map<string, string>([
  ["page:home", "page:home"],
  ...importedCatalog.categories.map(
    (category) =>
      [`category:${category.slug}`, `category:${category.id}`] as const,
  ),
  ...importedCatalog.products.map(
    (product) => [`product:${product.slug}`, `product:${product.id}`] as const,
  ),
]);

const keywordSeoUpdates = Object.entries(legacySeoMapping.keywords)
  .map(([mappedKey, keywords]) => ({
    key: seoEntryKeyByMappedKey.get(mappedKey),
    keywords: mergeKeywords(keywords),
  }))
  .filter(
    (entry): entry is { key: string; keywords: string } =>
      Boolean(entry.key && entry.keywords),
  );

const categoryHierarchyVersion = "hygienelinks-category-hierarchy-2026-08-04-v2";

function chunks<T>(items: T[], size = 5) {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, (index + 1) * size),
  );
}

const seedCategories: Array<typeof categories.$inferInsert> = [
  {
    id: "cat-chemicals",
    name: "Chemicals & Disinfectants",
    slug: "chemicals-disinfectants",
    description:
      "Professional formulas for floors, washrooms, kitchens, laundry and specialist applications.",
    imageUrl: "/products/floor-cleaner.jpg",
    accent: "blue",
    featured: true,
    sortOrder: 10,
  },
  {
    id: "sub-cleaning-chemicals",
    name: "Cleaning Chemicals",
    slug: "cleaning-chemicals",
    description: "Daily and heavy-duty cleaning formulas for professional use.",
    parentId: "cat-chemicals",
    imageUrl: "/products/cement-remover.png",
    accent: "blue",
    featured: true,
    sortOrder: 11,
  },
  {
    id: "sub-disinfectants",
    name: "Disinfectants & Sanitizers",
    slug: "disinfectants-sanitizers",
    description: "Hygiene-focused solutions for high-touch commercial spaces.",
    parentId: "cat-chemicals",
    imageUrl: "/products/acid-cleaner.png",
    accent: "green",
    sortOrder: 12,
  },
  {
    id: "cat-tools",
    name: "Cleaning Tools & Floor Care",
    slug: "cleaning-tools-floor-care",
    description:
      "Trolleys, mop systems, brooms, brushes and equipment for efficient facility care.",
    imageUrl: "/products/trolley.jpg",
    accent: "cyan",
    featured: true,
    sortOrder: 20,
  },
  {
    id: "sub-trolleys",
    name: "Trolleys & Mop Buckets",
    slug: "trolleys-mop-buckets",
    description: "Ergonomic janitorial systems for small rooms and large sites.",
    parentId: "cat-tools",
    imageUrl: "/products/trolley.jpg",
    accent: "cyan",
    sortOrder: 21,
  },
  {
    id: "sub-brooms",
    name: "Brooms & Mops",
    slug: "brooms-mops",
    description: "Color-coded manual cleaning tools for professional teams.",
    parentId: "cat-tools",
    accent: "cyan",
    sortOrder: 22,
  },
  {
    id: "cat-tissue",
    name: "Tissue & Paper",
    slug: "tissue-paper",
    description:
      "Commercial tissue, rolls, towels and paper essentials manufactured for reliable daily use.",
    imageUrl: "/products/maxi-roll.png",
    accent: "sky",
    featured: true,
    sortOrder: 30,
  },
  {
    id: "cat-washroom",
    name: "Washroom & Dispensers",
    slug: "washroom-dispensers",
    description:
      "Soap, tissue, air care and hand-drying systems for modern washrooms.",
    imageUrl: "/products/toilet-roll.png",
    accent: "blue",
    featured: true,
    sortOrder: 40,
  },
  {
    id: "cat-waste",
    name: "Waste Management & Bags",
    slug: "waste-management-bags",
    description:
      "Bins, liners and responsible waste solutions for every facility zone.",
    accent: "green",
    featured: true,
    sortOrder: 50,
  },
  {
    id: "sub-plastic-bags",
    name: "Plastic & Biodegradable Bags",
    slug: "plastic-biodegradable-bags",
    description: "Custom sizes, colors and thicknesses for commercial supply.",
    parentId: "cat-waste",
    accent: "green",
    sortOrder: 51,
  },
  {
    id: "cat-packaging",
    name: "Packaging & Jerry Cans",
    slug: "packaging-jerry-cans",
    description:
      "Durable plastic packaging manufactured for chemicals, lubricants and detergents.",
    imageUrl: "/products/jerry-can.jpg",
    accent: "navy",
    featured: true,
    sortOrder: 60,
  },
  {
    id: "cat-ppe",
    name: "PPE & Safety",
    slug: "ppe-safety",
    description:
      "Gloves, masks, safety wear and site essentials for protected teams.",
    accent: "orange",
    featured: true,
    sortOrder: 70,
  },
  {
    id: "cat-hospitality",
    name: "Hospitality & Specialty",
    slug: "hospitality-specialty",
    description:
      "Hotel amenities, pool care, pet care and specialist facility supplies.",
    accent: "violet",
    featured: true,
    sortOrder: 80,
  },
];

const seedProducts: Array<typeof products.$inferInsert> = [
  {
    id: "prod-cement-remover",
    name: "Cement Remover",
    slug: "cement-remover",
    sku: "HL-CC-014",
    categoryId: "sub-cleaning-chemicals",
    summary: "Heavy-duty post-construction cleaner for cement and mineral residue.",
    description:
      "A professional-strength solution designed to remove cement film and mineral deposits from compatible hard surfaces. Ask our team for application guidance and bulk supply options.",
    imageUrl: "/products/cement-remover.png",
    packSize: "1 L · 5 L · 20 L",
    applications: "Construction cleanup · Hard surfaces",
    featured: true,
    sortOrder: 10,
  },
  {
    id: "prod-acid-cleaner",
    name: "Acid Cleaner Premium",
    slug: "acid-cleaner-premium",
    sku: "HL-CC-026",
    categoryId: "sub-cleaning-chemicals",
    summary: "Concentrated hydrochloric acid cleaner for professional maintenance.",
    description:
      "A premium concentrated acid cleaner for trained professional use on compatible surfaces. Safety documentation and technical guidance are available on request.",
    imageUrl: "/products/acid-cleaner.png",
    packSize: "1 L · 5 L",
    applications: "Washrooms · Masonry · Industrial care",
    sortOrder: 20,
  },
  {
    id: "prod-floor-bathroom",
    name: "Floor & Bathroom Cleaner Premium",
    slug: "floor-bathroom-cleaner-premium",
    sku: "HL-CC-132",
    categoryId: "sub-cleaning-chemicals",
    summary: "Daily professional cleaner for floors, tiles and washroom surfaces.",
    description:
      "A versatile maintenance formula for facility teams seeking consistent results across floors, tiled areas and commercial washrooms.",
    imageUrl: "/products/floor-cleaner.jpg",
    packSize: "1 L · 5 L · 20 L",
    applications: "Floors · Washrooms · General facilities",
    featured: true,
    eco: true,
    sortOrder: 30,
  },
  {
    id: "prod-maxi-roll",
    name: "Maxi Roll Auto Cut",
    slug: "maxi-roll-auto-cut",
    sku: "HC-TP-1000",
    categoryId: "cat-tissue",
    summary: "High-absorbency commercial paper roll for auto-cut dispensers.",
    description:
      "A reliable commercial paper solution manufactured for busy washrooms, kitchens and service areas. Available in bulk packs for regional delivery.",
    imageUrl: "/products/maxi-roll.png",
    packSize: "1 × 6 rolls · 20 cm × 1000 g",
    applications: "Washrooms · Kitchens · Healthcare",
    featured: true,
    eco: true,
    sortOrder: 40,
  },
  {
    id: "prod-toilet-roll",
    name: "Commercial Toilet Roll",
    slug: "commercial-toilet-roll",
    sku: "HC-TP-220",
    categoryId: "cat-tissue",
    summary: "Soft, dependable tissue manufactured for commercial washrooms.",
    description:
      "Commercial toilet tissue produced for dependable everyday performance, with custom pack configurations available for distributors and facility teams.",
    imageUrl: "/products/toilet-roll.png",
    packSize: "Bulk cartons available",
    applications: "Hotels · Offices · Healthcare",
    sortOrder: 50,
  },
  {
    id: "prod-jerry-can",
    name: "Plastic Jerry Can 5 L",
    slug: "plastic-jerry-can-5l",
    sku: "HL-PJ-005",
    categoryId: "cat-packaging",
    summary: "Durable, chemical-resistant 5 L container with secure handle.",
    description:
      "Manufactured in-house using quality plastic and tested for durability. Suitable for detergent, chemical and lubricant businesses, with private-label options.",
    imageUrl: "/products/jerry-can.jpg",
    packSize: "5 L · Custom colors",
    applications: "Chemicals · Detergents · Lubricants",
    featured: true,
    sortOrder: 60,
  },
  {
    id: "prod-trolley",
    name: "Double Bucket Trolley Nick 50 L",
    slug: "double-bucket-trolley-nick-50l",
    sku: "TTS-NICK-50",
    categoryId: "sub-trolleys",
    summary: "Professional double-bucket trolley for controlled floor cleaning.",
    description:
      "A robust, maneuverable cleaning trolley designed for frequent professional use in hotels, hospitals, offices and public facilities.",
    imageUrl: "/products/trolley.jpg",
    packSize: "50 L double bucket",
    applications: "Hospitality · Healthcare · Facilities",
    featured: true,
    sortOrder: 70,
  },
  {
    id: "prod-oxo-bag",
    name: "Oxo Biodegradable Garbage Bag",
    slug: "oxo-biodegradable-garbage-bag",
    sku: "HL-BAG-OXO",
    categoryId: "sub-plastic-bags",
    summary: "Customizable oxo-biodegradable bags for responsible waste handling.",
    description:
      "Manufactured in a range of sizes, colors and thicknesses to match commercial waste streams and site requirements.",
    imageUrl: "",
    packSize: "Multiple sizes · Custom thickness",
    applications: "Facilities · Hospitality · Waste handling",
    eco: true,
    sortOrder: 80,
  },
];

const seedContent: Array<typeof contentBlocks.$inferInsert> = [
  {
    key: "hero_eyebrow",
    label: "Hero eyebrow",
    value: "MANUFACTURER · IMPORTER · EXPORTER",
    groupName: "Home hero",
    inputType: "text",
    sortOrder: 10,
  },
  {
    key: "hero_title",
    label: "Hero title",
    value: "Professional hygiene products for cleaner, safer facilities.",
    groupName: "Home hero",
    inputType: "textarea",
    sortOrder: 20,
  },
  {
    key: "hero_body",
    label: "Hero description",
    value:
      "Source cleaning chemicals, washroom essentials, tools and facility supplies from one experienced regional partner.",
    groupName: "Home hero",
    inputType: "textarea",
    sortOrder: 30,
  },
  {
    key: "intro_kicker",
    label: "Introduction kicker",
    value: "A ONE-STOP HYGIENE PARTNER",
    groupName: "Home introduction",
    inputType: "text",
    sortOrder: 40,
  },
  {
    key: "intro_title",
    label: "Introduction title",
    value: "From our factories to your facility.",
    groupName: "Home introduction",
    inputType: "textarea",
    sortOrder: 50,
  },
  {
    key: "intro_body",
    label: "Introduction description",
    value:
      "Diamond Capital Oasis manufactures and supplies plastic bags, detergents, disinfectants and paper products, while sourcing specialist equipment and consumables for businesses across the Gulf.",
    groupName: "Home introduction",
    inputType: "textarea",
    sortOrder: 60,
  },
  {
    key: "home_about_kicker",
    label: "About section kicker",
    value: "WELCOME TO DIAMOND CAPITAL OASIS",
    groupName: "Home about section",
    inputType: "text",
    sortOrder: 55,
  },
  {
    key: "home_about_title",
    label: "About section title",
    value: "A growing hygiene group built around customer satisfaction.",
    groupName: "Home about section",
    inputType: "textarea",
    sortOrder: 56,
  },
  {
    key: "home_about_body",
    label: "About section content",
    value:
      "Diamond Capital Oasis is an exciting, fast-growing group with the aim to be a conglomerate indulging in the manufacturing of plastic Bags, detergents, and disinfectants, paper products, imports and exports of cleaning products, PPE, aerosols, washroom products etc. Our group has a family-friendly atmosphere, with a strong dedication to customer satisfaction, and a drive to provide positive contributions as cleaning products manufacturers and suppliers in Dubai, UAE.",
    groupName: "Home about section",
    inputType: "textarea",
    sortOrder: 57,
  },
  {
    key: "home_about_video",
    label: "YouTube video link",
    value: "https://youtu.be/GGhXY2ng-GE?si=A0i6n1mmZNiwQJMR",
    groupName: "Home about section",
    inputType: "text",
    sortOrder: 58,
  },
  {
    key: "supplier_intro_title",
    label: "Supplier section heading",
    value: "Trusted Cleaning Equipment Supplier in Dubai, UAE & Oman",
    groupName: "Home supplier introduction",
    inputType: "textarea",
    sortOrder: 200,
  },
  {
    key: "supplier_intro_body",
    label: "Supplier section introduction",
    value:
      "At Diamond Capital Oasis, one of the best cleaning materials suppliers in UAE & Oman, we take pleasure in providing a wide range of goods that meet the specific demands of different sectors as a top manufacturer and distributor of cleaning and hygiene supplies. In addition to having a strong commitment to customer satisfaction and a desire to make a positive impact as cleaning products suppliers in UAE & Oman, our group has a family-friendly culture.",
    groupName: "Home supplier introduction",
    inputType: "textarea",
    sortOrder: 201,
  },
  {
    key: "supplier_range_title",
    label: "Cleaning range heading",
    value: "Our Range of Cleaning Products",
    groupName: "Home supplier introduction",
    inputType: "text",
    sortOrder: 202,
  },
  {
    key: "supplier_range_body",
    label: "Cleaning range introduction",
    value:
      "We offer a comprehensive range of cleaning products UAE & Oman to cater to diverse cleaning requirements:",
    groupName: "Home supplier introduction",
    inputType: "textarea",
    sortOrder: 203,
  },
  {
    key: "supplier_range_1_title",
    label: "Range 1 title",
    value: "Disinfectants and Sanitizers",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 210,
  },
  {
    key: "supplier_range_1_body",
    label: "Range 1 description",
    value:
      "Our selection of hand wash and sanitizers ensures the highest levels of hygiene in any setting.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 211,
  },
  {
    key: "supplier_range_2_title",
    label: "Range 2 title",
    value: "Cleaning Chemicals",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 212,
  },
  {
    key: "supplier_range_2_body",
    label: "Range 2 description",
    value:
      "Our assortment of cleaning solutions, which includes glass cleaners, degreasers, and all-purpose cleaners, guarantees complete and effective cleaning outcomes. In order to keep your pool in perfect shape, we also offer swimming pool chemicals.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 213,
  },
  {
    key: "supplier_range_3_title",
    label: "Range 3 title",
    value: "Cleaning Tools and Equipment",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 214,
  },
  {
    key: "supplier_range_3_body",
    label: "Range 3 description",
    value:
      "From hoover cleaners and scrubbers to mops and brooms, we provide a wide range of cleaning tools and equipment to help you clean effectively.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 215,
  },
  {
    key: "supplier_range_4_title",
    label: "Range 4 title",
    value: "Personal Protective Equipment",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 216,
  },
  {
    key: "supplier_range_4_body",
    label: "Range 4 description",
    value:
      "To safeguard the wellbeing of cleaning staff, we place a high priority on safety and provide a variety of personal protective equipment, such as gloves, masks, vests, helmets, and shoes.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 217,
  },
  {
    key: "supplier_range_5_title",
    label: "Range 5 title",
    value: "Disposable Products",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 218,
  },
  {
    key: "supplier_range_5_body",
    label: "Range 5 description",
    value:
      "Trash bags, paper towels, and toilet tissues are examples of our disposable products that provide convenience and hygienic disposal methods.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 219,
  },
  {
    key: "supplier_range_6_title",
    label: "Range 6 title",
    value: "Specialized Cleaning Products",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 220,
  },
  {
    key: "supplier_range_6_body",
    label: "Range 6 description",
    value:
      "We offer products including floor polish, carpet cleaners, and stainless steel cleaners for specific cleaning requirements. These products produce remarkable results in a range of cleaning applications.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 221,
  },
  {
    key: "supplier_range_7_title",
    label: "Range 7 title",
    value: "Window Cleaning Solutions",
    groupName: "Home cleaning product ranges",
    inputType: "text",
    sortOrder: 222,
  },
  {
    key: "supplier_range_7_body",
    label: "Range 7 description",
    value:
      "Our window cleaning products, which include microfiber cloths and wipers, guarantee consistently streak-free, spotless windows.",
    groupName: "Home cleaning product ranges",
    inputType: "textarea",
    sortOrder: 223,
  },
  {
    key: "supplier_why_title",
    label: "Why choose us heading",
    value: "Why Choose Diamond Capital Oasis?",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 230,
  },
  {
    key: "supplier_why_body",
    label: "Why choose us introduction",
    value:
      "As the cleaning equipments suppliers in UAE & Oman, we’re a cleaning company dedicated to providing its customers with quality service and making sure they’re completely satisfied with the results.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 231,
  },
  {
    key: "supplier_benefit_1_title",
    label: "Benefit 1 title",
    value: "Quality",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 232,
  },
  {
    key: "supplier_benefit_1_body",
    label: "Benefit 1 description",
    value:
      "Our commitment is to consistently uphold the highest standards of excellence in every aspect of cleaning and related tasks. To achieve this, we have implemented a comprehensive quality control system throughout our company, covering cleaning and all other service-related tasks.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 233,
  },
  {
    key: "supplier_benefit_2_title",
    label: "Benefit 2 title",
    value: "Bulk Ordering Benefits",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 234,
  },
  {
    key: "supplier_benefit_2_body",
    label: "Benefit 2 description",
    value:
      "Enjoy cost savings and convenience with our bulk ordering options, designed to accommodate varying cleaning requirements.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 235,
  },
  {
    key: "supplier_benefit_3_title",
    label: "Benefit 3 title",
    value: "Flexible Delivery Services",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 236,
  },
  {
    key: "supplier_benefit_3_body",
    label: "Benefit 3 description",
    value:
      "With our efficient delivery services and extensive coverage areas across the UAE & Oman, we ensure prompt and hassle-free delivery of your orders.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 237,
  },
  {
    key: "supplier_benefit_4_title",
    label: "Benefit 4 title",
    value: "Competitive Pricing",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 238,
  },
  {
    key: "supplier_benefit_4_body",
    label: "Benefit 4 description",
    value:
      "We offer competitive pricing strategies, making high-quality cleaning products accessible and affordable for businesses of all sizes.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 239,
  },
  {
    key: "supplier_benefit_5_title",
    label: "Benefit 5 title",
    value: "Customized Solutions",
    groupName: "Home supplier benefits",
    inputType: "text",
    sortOrder: 240,
  },
  {
    key: "supplier_benefit_5_body",
    label: "Benefit 5 description",
    value:
      "Our flexible approach allows us to tailor solutions to your specific needs, ensuring maximum satisfaction and efficiency in your cleaning operations.",
    groupName: "Home supplier benefits",
    inputType: "textarea",
    sortOrder: 241,
  },
  {
    key: "supplier_closing_title",
    label: "Closing section heading",
    value: "Trusted Cleaning Equipment Supplier in UAE & Oman",
    groupName: "Home supplier closing",
    inputType: "textarea",
    sortOrder: 250,
  },
  {
    key: "supplier_closing_body_1",
    label: "Closing paragraph 1",
    value:
      "Diamond Capital Oasis strives to deliver high-quality cleaning services and cleaning supplies UAE & Oman. We pride ourselves in building relationships with our customers, by going the extra mile for them. We have always given the best service possible and we must have been doing something right, as some of our customers have been with us from the start.",
    groupName: "Home supplier closing",
    inputType: "textarea",
    sortOrder: 251,
  },
  {
    key: "supplier_closing_body_2",
    label: "Closing paragraph 2",
    value:
      "We are proud of our journey and excited about the future as we continue to provide top-quality products, innovative solutions, and exceptional service to businesses across various sectors. Contact us right away to avail the best cleaning products UAE & Oman.",
    groupName: "Home supplier closing",
    inputType: "textarea",
    sortOrder: 252,
  },
  {
    key: "categories_kicker",
    label: "Categories kicker",
    value: "EXPLORE THE RANGE",
    groupName: "Home categories",
    inputType: "text",
    sortOrder: 61,
  },
  {
    key: "categories_title",
    label: "Categories title",
    value: "Everything your facility needs, organized clearly.",
    groupName: "Home categories",
    inputType: "textarea",
    sortOrder: 62,
  },
  {
    key: "categories_body",
    label: "Categories description",
    value:
      "Browse a procurement-friendly range with categories, subcategories and market availability managed from one place.",
    groupName: "Home categories",
    inputType: "textarea",
    sortOrder: 63,
  },
  {
    key: "featured_kicker",
    label: "Featured products kicker",
    value: "READY TO SOURCE",
    groupName: "Home featured products",
    inputType: "text",
    sortOrder: 64,
  },
  {
    key: "featured_title",
    label: "Featured products title",
    value: "Popular products for professional teams.",
    groupName: "Home featured products",
    inputType: "textarea",
    sortOrder: 65,
  },
  {
    key: "industries_kicker",
    label: "Industries kicker",
    value: "SOLUTIONS BY SECTOR",
    groupName: "Home industries",
    inputType: "text",
    sortOrder: 66,
  },
  {
    key: "industries_title",
    label: "Industries title",
    value: "Built around the way your industry works.",
    groupName: "Home industries",
    inputType: "textarea",
    sortOrder: 67,
  },
  {
    key: "industries_body",
    label: "Industries description",
    value:
      "Our team helps match products, pack sizes and delivery plans to the standards of each operating environment.",
    groupName: "Home industries",
    inputType: "textarea",
    sortOrder: 68,
  },
  {
    key: "why_kicker",
    label: "Why choose us kicker",
    value: "WHY DIAMOND CAPITAL OASIS",
    groupName: "Home benefits",
    inputType: "text",
    sortOrder: 69,
  },
  {
    key: "why_title",
    label: "Why choose us title",
    value: "More than a supplier—your regional hygiene partner.",
    groupName: "Home benefits",
    inputType: "textarea",
    sortOrder: 70,
  },
  {
    key: "why_body",
    label: "Why choose us description",
    value:
      "Manufacturing strength, specialist sourcing and responsive support come together in one dependable supply relationship.",
    groupName: "Home benefits",
    inputType: "textarea",
    sortOrder: 71,
  },
  {
    key: "cta_title",
    label: "Enquiry section title",
    value: "Need the right products for your site?",
    groupName: "Home enquiry",
    inputType: "text",
    sortOrder: 80,
  },
  {
    key: "cta_body",
    label: "Enquiry section description",
    value:
      "Tell our team what you clean, where you operate and the quantities you need. We’ll help build the right supply list.",
    groupName: "Home enquiry",
    inputType: "textarea",
    sortOrder: 81,
  },
  {
    key: "about_title",
    label: "About page title",
    value: "Building a cleaner future across the Gulf.",
    groupName: "About page",
    inputType: "textarea",
    sortOrder: 90,
  },
  {
    key: "about_body",
    label: "About page introduction",
    value:
      "Diamond Capital Oasis (Division of Hygiene Links) is a multidivisional manufacturer, importer and exporter focused on practical hygiene solutions, consistent quality and long-term customer relationships.",
    groupName: "About page",
    inputType: "textarea",
    sortOrder: 91,
  },
  {
    key: "mission",
    label: "Mission statement",
    value:
      "To make dependable, responsible hygiene products accessible to every business we serve through manufacturing, smart sourcing and committed support.",
    groupName: "About page",
    inputType: "textarea",
    sortOrder: 92,
  },
  {
    key: "vision",
    label: "Vision statement",
    value:
      "To be the Gulf’s most trusted one-stop partner for professional hygiene, facility care and customized product solutions.",
    groupName: "About page",
    inputType: "textarea",
    sortOrder: 93,
  },
  {
    key: "about_profile_intro",
    label: "Company profile introduction",
    value:
      "Diamond Capital Oasis is an exciting, fast-growing group with the aim to be a conglomerate indulging in the manufacturing of plastic Bags, detergents and disinfectants, paper products, imports and exports of cleaning products, PPE, aerosols, washroom products etc. Our group has a family-friendly atmosphere, with a strong dedication to customer satisfaction, and a drive to provide positive contributions to the society by doing business with the aim to provide simple, affordable but with high-quality solutions catering to the day to day hygiene and cleaning.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 94,
  },
  {
    key: "about_tts_dealer",
    label: "TTS dealer content",
    value: "We are the dealers of TTS Italy products and its accessories in UAE.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 95,
  },
  {
    key: "about_plastic_manufacturing",
    label: "Plastic manufacturing unit",
    value:
      "Our Plastic factory has a capacity to do 400 MT productions per month. Our plastic factory Concentrating more into the manufacturing of Garbage bags 100% Virgin Oxo biodegradable (HD & LD) Carry bags, Banana Cut Bags etc.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 96,
  },
  {
    key: "about_detergent_manufacturing",
    label: "Detergent and disinfectant unit",
    value:
      "We produce a range of products such as All-purpose cleaner (General purpose cleaner), Hand Soap Liquid, Bleach, Glass cleaners, a variety of disinfectants etc.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 97,
  },
  {
    key: "about_paper_factory",
    label: "Paper products factory",
    value:
      "Our paper products factory has a capacity of 100 MT productions per month. We are concentrating more on the manufacturing of Facial Tissues, Maxi Rolls, interfold Tissues, Toilet Rolls, Paper Napkins etc. We are using 100% virgin pulp only.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 98,
  },
  {
    key: "about_import_export",
    label: "Import and export content",
    value:
      "Though our Group’s core business activities are diversified manufacturing, we also focus on cleaning products import and re-export.",
    groupName: "About page — Company profile",
    inputType: "textarea",
    sortOrder: 99,
  },
  {
    key: "about_regional_intro",
    label: "Regional supply introduction",
    value:
      "We offer a wide range of industrial, institutional and personal hygiene products to customers in the United Arab Emirates. As a Super Care products supplier in Muscat, Oman, we have a customer-oriented approach to doing business. We are known for the quality of products we offer in a speedy and cost-efficient way.",
    groupName: "About page — Regional story",
    inputType: "textarea",
    sortOrder: 100,
  },
  {
    key: "about_workplace_hygiene",
    label: "Workplace hygiene content",
    value:
      "Stocking your workplace with the right forms of hygiene goods will help you cause your work setting to be a pleasant environment. Hygiene items are important to maintain a neat and sanitary place of work. We offer these kinds of products in a wide variety. Take soap and hand sanitizer dispensers, for instance. Installing these kinds of dispensers in areas such as washrooms is among the best ways of preventing the transmission of germs. We provide a range of dispensers that you can install in office areas with heavy traffic.",
    groupName: "About page — Regional story",
    inputType: "textarea",
    sortOrder: 101,
  },
  {
    key: "about_washroom_hygiene",
    label: "Washroom hygiene content",
    value:
      "Hygienic washrooms pave the way for cleaner workplaces and other commercial environments, and we know this. This is why we deal in an array of quality hygiene products. Thoroughly go through our website to know more about what we offer in our capacity of being a Super Care products supplier in Muscat, Oman, and otherwise.",
    groupName: "About page — Regional story",
    inputType: "textarea",
    sortOrder: 102,
  },
  {
    key: "about_dominant_attributions",
    label: "Dominant attributions statement",
    value:
      "Our Dominant attributions are Quality, Service provided with competitive price.",
    groupName: "About page — Regional story",
    inputType: "textarea",
    sortOrder: 103,
  },
  {
    key: "chairman_title",
    label: "Chairman page title",
    value: "Chairman’s Message",
    groupName: "Chairman’s Message page",
    inputType: "text",
    sortOrder: 120,
  },
  {
    key: "chairman_image",
    label: "Chairman portrait URL",
    value: "/brand/chairman-mubarak-al-hajeri.jpeg",
    groupName: "Chairman’s Message page",
    inputType: "text",
    sortOrder: 121,
  },
  ...[
    "Having started a venture 17 years ago, that had a simple beginning and that which has grown steady and stable, on the path to a roaring success today, I am privileged to be a founding member of one of the most competitive groups of companies that have made its mark and presence into plastic manufacturing, paper converting, detergents and disinfectants manufacturing, import and export of various cleaning products with emphasis on efficiency in operations, reliability for customers and trust on sustainable development, by catering to the present and with an eye on the future.",
    "For our group, sustainability signifies aligning the economic success with environmental and social responsibility. Our approach has the responsibility with a social dimension based on our belief that the long-term success of our organization depends on the existence of stable and economically viable communities.",
    "The changing face and the nature of the industry which faces a constant challenge to improve ourselves day by day allows us to gain invaluable experience and guides us to newer avenues and reach greater heights.",
    "We are now more accustomed to the importance of sustainable growth and learn insights and wisdom on sustainability and that leads to growth.",
    "Looking forward, we have merely reached the next level that each member of our group needs to focus on. Ensuring that the group will support by itself a sustainable growth regardless of external factors. We have the key success elements necessary to withstand the winds of change. The stimulation provided to build a highly skilled and creative research and development team is supported by the state-of-the-art infrastructure. Our well-recognized market presence with a broad product portfolio, which is being marked up with newer product ranges and efficient manufacturing capabilities that boast of high-quality production and cost-effectiveness.",
    "I would like to thank our group Management Colleagues, CEO, Directors, Employees, Customers, Suppliers, and other stakeholders, for their dedication and support in our constant endeavor to deliver high-quality products at an affordable cost. We are committed to improving the efficiencies in our operations and differentiating ourselves in the market-place through customer-focused innovation in product and services, so as to build a stronger and sustainable future for our group and for our associates.",
  ].map((value, index) => ({
    key: `chairman_message_${index + 1}`,
    label: `Chairman message paragraph ${index + 1}`,
    value,
    groupName: "Chairman’s Message page",
    inputType: "textarea",
    sortOrder: 122 + index,
  })),
  {
    key: "chairman_name",
    label: "Chairman name",
    value: "Mubarak Thallab Al Hajeri",
    groupName: "Chairman’s Message page",
    inputType: "text",
    sortOrder: 128,
  },
  {
    key: "chairman_role",
    label: "Chairman role",
    value: "Chairman",
    groupName: "Chairman’s Message page",
    inputType: "text",
    sortOrder: 129,
  },
  {
    key: "vision_mission_title",
    label: "Vision and Mission page title",
    value: "Vision & Mission",
    groupName: "Vision & Mission page",
    inputType: "text",
    sortOrder: 140,
  },
  {
    key: "vision_statement",
    label: "Vision statement",
    value:
      "Be the preferred versatile group that provides cost-effective and innovative products in Facilities and housekeeping, providing products and services to hospitality sector through professionalism and cohesiveness",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 141,
  },
  {
    key: "mission_statement",
    label: "Mission statement",
    value:
      "By harnessing and utilizing the environment that creates user-friendly, eco-friendly, biodegradable, high-quality cleaning and chemical solutions ranging from cleaning, plastic, and paper products that are resourceful and takes care of the day to day housekeeping needs.",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 142,
  },
  {
    key: "mission_tagline",
    label: "Mission tagline",
    value: "A one-stop solution for all your hygiene needs",
    groupName: "Vision & Mission page",
    inputType: "text",
    sortOrder: 143,
  },
  {
    key: "environment_policy_1",
    label: "Environmental policy paragraph 1",
    value:
      "For the environmentally conscious, Hygiene Links Supply source boasts of a full line of environmentally friendly “Green” products. The impact of the cleaning industry on our planet is tremendous. If you wish to be environmentally conscious, let Hygiene Links supply source be your “Green” advisor today!",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 144,
  },
  {
    key: "environment_policy_2",
    label: "Environmental policy paragraph 2",
    value:
      "We comply with global standard environmental regulation, and follow the concept “green clean”",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 145,
  },
  {
    key: "values_statement",
    label: "Values statement",
    value: "Integrity, Excellence, diverse and strive to “walk the talk”",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 146,
  },
  {
    key: "values_commitment",
    label: "Values commitment",
    value:
      "Our group is dedicated and committed to providing our customers with the best quality products and services.",
    groupName: "Vision & Mission page",
    inputType: "textarea",
    sortOrder: 147,
  },
  {
    key: "values_closing",
    label: "Values closing",
    value: "We look forward to serving you!",
    groupName: "Vision & Mission page",
    inputType: "text",
    sortOrder: 148,
  },
  {
    key: "contact_title",
    label: "Contact page title",
    value: "Let’s build the right supply plan.",
    groupName: "Contact page",
    inputType: "textarea",
    sortOrder: 100,
  },
  {
    key: "contact_body",
    label: "Contact page introduction",
    value:
      "Tell us about your facility, market and product needs. Our regional team will connect you with the right range and pack sizes.",
    groupName: "Contact page",
    inputType: "textarea",
    sortOrder: 101,
  },
  {
    key: "clients_title",
    label: "Clients section title",
    value: "Trusted by leading organizations.",
    groupName: "Home clients",
    inputType: "text",
    sortOrder: 104,
  },
  {
    key: "clients_body",
    label: "Clients section description",
    value:
      "Long-term supply relationships across facilities management, hospitality, healthcare, retail and industry.",
    groupName: "Home clients",
    inputType: "textarea",
    sortOrder: 105,
  },
  ...[
    {
      key: "abu_dhabi",
      market: "UAE",
      city: "Abu Dhabi",
      company: "Hygiene Links, Head Office",
      address:
        "Al Falah Tower - Muroor Road, Office No: 101, Al Falah Street, Abu Dhabi - UAE, Post Box No. 92060",
      phone: "+971 50 568 9879",
      fax: "",
      email: "info@hygienelinks.com",
      map: "Hygiene Links Head Office Al Falah Tower Abu Dhabi",
    },
    {
      key: "dubai",
      market: "UAE",
      city: "Dubai",
      company: "Hygiene Links",
      address:
        "Pagoda House, Block-10, Near Dubai Feed Factory, Dubai Investment Park 1, Post Box No. 8948",
      phone: "+971 50 568 9879",
      fax: "",
      email: "info@hygienelinks.com",
      map: "Pagoda House Block 10 Dubai Investment Park 1",
    },
    {
      key: "umm_al_quwain",
      market: "UAE",
      city: "Umm Al Quwain",
      company: "Paper Link Paper Converting Industry",
      address:
        "New Industrial Area, Umm Al Thoub, 7 Street, Itihad, Umm Al Quwain - UAE, P.O. Box 1289",
      phone: "+971 50 568 9879",
      fax: "",
      email: "info@hygienelinks.com",
      map: "Paper Link Paper Converting Industry Umm Al Quwain",
    },
    {
      key: "doha",
      market: "QATAR",
      city: "Doha",
      company: "Hi-Care Trading",
      address: "Post Box No. 96289, Doha - Qatar",
      phone: "+974 4481 9449",
      fax: "+974 4481 7228",
      email: "info@hicareqatar.com",
      map: "Hi Care Hygiene Solution Doha Qatar",
    },
    {
      key: "barka",
      market: "OMAN",
      city: "Barka",
      company: "Diamond Capital Oasis (Division of Hygiene Links)",
      address: "Diamond Capital Oasis, CR No. 1172245, Barka, Sultanate of Oman",
      phone: "+968 2698 5306",
      fax: "+968 52 614 2931",
      email: "oman@hygienelinks.com",
      map: "Barka Oman",
    },
  ].flatMap((office, officeIndex) =>
    [
      ["market", "Market", office.market, "text"],
      ["city", "City", office.city, "text"],
      ["company", "Company name", office.company, "text"],
      ["address", "Address", office.address, "textarea"],
      ["phone", "Phone", office.phone, "text"],
      ["fax", "Fax / secondary phone", office.fax, "text"],
      ["email", "Email", office.email, "text"],
      ["map", "Google Maps query or embed URL", office.map, "text"],
    ].map(([field, label, value, inputType], fieldIndex) => ({
      key: `office_${office.key}_${field}`,
      label,
      value,
      groupName: `Contact office — ${office.city}`,
      inputType,
      sortOrder: 160 + officeIndex * 10 + fieldIndex,
    })),
  ),
  {
    key: "blog_title",
    label: "Blog page title",
    value: "Practical guidance for cleaner, safer facilities.",
    groupName: "Blog page",
    inputType: "textarea",
    sortOrder: 110,
  },
  {
    key: "blog_body",
    label: "Blog page introduction",
    value:
      "Explore straightforward advice on professional cleaning, product selection, washroom care and responsible facility supply.",
    groupName: "Blog page",
    inputType: "textarea",
    sortOrder: 111,
  },
  {
    key: "blog_featured_category",
    label: "Featured article category",
    value: "FACILITY CARE",
    groupName: "Blog featured article",
    inputType: "text",
    sortOrder: 112,
  },
  {
    key: "blog_featured_date",
    label: "Featured article date",
    value: "July 2026",
    groupName: "Blog featured article",
    inputType: "text",
    sortOrder: 113,
  },
  {
    key: "blog_featured_title",
    label: "Featured article title",
    value: "How to build a reliable cleaning supply plan for every facility zone",
    groupName: "Blog featured article",
    inputType: "textarea",
    sortOrder: 114,
  },
  {
    key: "blog_featured_body",
    label: "Featured article summary",
    value:
      "A practical framework for matching chemicals, tools, paper products and replenishment cycles to the real demands of your site.",
    groupName: "Blog featured article",
    inputType: "textarea",
    sortOrder: 115,
  },
  {
    key: "blog_post_1_title",
    label: "Article 1 title",
    value: "Choosing the right commercial floor cleaner",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 120,
  },
  {
    key: "blog_post_1_body",
    label: "Article 1 summary",
    value:
      "Understand surface compatibility, dilution, traffic levels and safety requirements before selecting a daily floor-care product.",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 121,
  },
  {
    key: "blog_post_2_title",
    label: "Article 2 title",
    value: "A smarter approach to washroom consumables",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 122,
  },
  {
    key: "blog_post_2_body",
    label: "Article 2 summary",
    value:
      "Balance dispenser compatibility, user volume and refill frequency to reduce waste without compromising hygiene standards.",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 123,
  },
  {
    key: "blog_post_3_title",
    label: "Article 3 title",
    value: "What to include in a professional cleaning trolley",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 124,
  },
  {
    key: "blog_post_3_body",
    label: "Article 3 summary",
    value:
      "Organize color-coded tools, chemicals and PPE so cleaning teams can work efficiently while minimizing cross-contamination.",
    groupName: "Blog articles",
    inputType: "textarea",
    sortOrder: 125,
  },
];

const seedSettings: Array<typeof siteSettings.$inferInsert> = [
  {
    key: "email",
    label: "Main enquiry email",
    value: "info@diamondcapitaloasis.com",
    sortOrder: 10,
  },
  {
    key: "phone",
    label: "Customer hotline",
    value: "+971 50 568 9879",
    sortOrder: 20,
  },
  {
    key: "whatsapp",
    label: "WhatsApp number",
    value: "971505689879",
    sortOrder: 30,
  },
  {
    key: "markets",
    label: "Markets",
    value: "OMAN · UAE · QATAR",
    sortOrder: 40,
  },
  {
    key: "address",
    label: "Primary address",
    value: "Barka, Sultanate of Oman / Dubai Investment Park 1, Dubai, UAE",
    sortOrder: 50,
  },
  {
    key: "catalog_claim",
    label: "Catalog size claim",
    value: "500+",
    sortOrder: 60,
  },
  {
    key: "site_name",
    label: "Site name",
    value: "Diamond Capital Oasis",
    sortOrder: 100,
  },
  {
    key: "site_url",
    label: "Canonical website URL",
    value: process.env.NEXT_PUBLIC_SITE_URL || "https://www.diamondcapitaloasis.com",
    sortOrder: 110,
  },
  {
    key: "default_meta_title",
    label: "Default meta title",
    value: "Diamond Capital Oasis | Professional Hygiene Products",
    sortOrder: 120,
  },
  {
    key: "default_meta_description",
    label: "Default meta description",
    value:
      "Professional cleaning chemicals, tissue products, tools and facility supplies across Oman, UAE and Qatar.",
    sortOrder: 130,
  },
  {
    key: "default_keywords",
    label: "Default SEO keywords",
    value:
      "cleaning products Oman, hygiene products Barka, cleaning chemicals Muscat, hygiene supplies UAE, Diamond Capital Oasis",
    sortOrder: 140,
  },
  {
    key: "default_og_image",
    label: "Default social sharing image",
    value: "/brand/dco-logo.png",
    sortOrder: 150,
  },
  {
    key: "robots_index",
    label: "Allow search-engine indexing",
    value: process.env.STAGING_NOINDEX === "true" ? "false" : "true",
    sortOrder: 160,
  },
  {
    key: "google_site_verification",
    label: "Google Search Console verification",
    value: "RaAzq6JSBe41dVSgbY8_xdiBZrZjvZb_Jav1z7e2k7c",
    sortOrder: 170,
  },
  {
    key: "bing_site_verification",
    label: "Bing Webmaster verification",
    value: "",
    sortOrder: 180,
  },
  {
    key: "organization_name",
    label: "Organization name for structured data",
    value: "Diamond Capital Oasis",
    sortOrder: 190,
  },
  {
    key: "organization_legal_name",
    label: "Legal organization name",
    value: "Diamond Capital Oasis LLC (Division of Hygiene Links)",
    sortOrder: 200,
  },
  {
    key: "organization_logo",
    label: "Organization logo URL",
    value: "/brand/dco-logo.png",
    sortOrder: 210,
  },
  {
    key: "social_linkedin",
    label: "LinkedIn profile URL",
    value: "https://www.linkedin.com/company/hygiene-links/",
    sortOrder: 220,
  },
  {
    key: "social_instagram",
    label: "Instagram profile URL",
    value: "https://www.instagram.com/hygiene_links/",
    sortOrder: 230,
  },
  {
    key: "social_facebook",
    label: "Facebook profile URL",
    value: "https://www.facebook.com/hygienelinks/?ref=aymt_homepage_panel",
    sortOrder: 240,
  },
  {
    key: "social_x",
    label: "X profile URL",
    value: "https://twitter.com/hygiene_links",
    sortOrder: 250,
  },
  {
    key: "social_youtube",
    label: "YouTube channel URL",
    value: "https://www.youtube.com/results?search_query=hygiene+links",
    sortOrder: 260,
  },
  {
    key: "gtm_id",
    label: "Google Tag Manager container ID",
    value: "",
    sortOrder: 300,
  },
  {
    key: "ga4_id",
    label: "Google Analytics 4 measurement ID",
    value: "",
    sortOrder: 310,
  },
  {
    key: "google_ads_id",
    label: "Google Ads conversion ID",
    value: "",
    sortOrder: 320,
  },
  {
    key: "google_ads_conversion_label",
    label: "Google Ads enquiry conversion label",
    value: "",
    sortOrder: 330,
  },
  {
    key: "meta_pixel_id",
    label: "Meta Pixel ID",
    value: "",
    sortOrder: 340,
  },
];

const seedSeoEntries: Array<typeof seoEntries.$inferInsert> = [
  {
    key: "page:home",
    entityType: "page",
    entityId: "home",
    label: "Home page",
    metaTitle: "Professional Hygiene Products in UAE, Oman & Qatar",
    metaDescription:
      "Explore professional cleaning chemicals, tissue products, tools, washroom supplies and facility essentials from Diamond Capital Oasis.",
    keywords: mappedKeywords(
      "page:home",
      "professional hygiene products, cleaning products UAE, facility supplies Dubai",
    ),
    canonicalPath: "/",
  },
  {
    key: "page:catalog",
    entityType: "page",
    entityId: "catalog",
    label: "Product catalog",
    metaTitle: "Professional Cleaning & Hygiene Product Catalog",
    metaDescription:
      "Browse cleaning chemicals, paper products, tools, washroom supplies, waste solutions, PPE and specialty products.",
    keywords:
      "cleaning products catalog, hygiene supplies, facility care products",
    canonicalPath: "/catalog.html",
  },
  {
    key: "page:about",
    entityType: "page",
    entityId: "about",
    label: "About page",
    metaTitle: "About Diamond Capital Oasis",
    metaDescription:
      "Learn about Hygiene Links, a multidivisional manufacturer, importer and exporter serving professional hygiene needs across the Gulf.",
    keywords: "Hygiene Links, hygiene manufacturer UAE, cleaning supplier Gulf",
    canonicalPath: "/about.html",
  },
  {
    key: "page:chairman",
    entityType: "page",
    entityId: "chairman",
    label: "Chairman’s Message page",
    metaTitle: "Chairman’s Message",
    metaDescription:
      "Read a message from Diamond Capital Oasis Chairman Mubarak Thallab Al Hajeri about sustainable growth, innovation and customer trust.",
    keywords:
      "Diamond Capital Oasis chairman, Mubarak Thallab Al Hajeri, Hygiene Links leadership",
    canonicalPath: "/chairmans-message.html",
  },
  {
    key: "page:vision-mission",
    entityType: "page",
    entityId: "vision-mission",
    label: "Vision & Mission page",
    metaTitle: "Vision & Mission",
    metaDescription:
      "Explore the vision, mission, environmental policy and values that guide Diamond Capital Oasis.",
    keywords:
      "Diamond Capital Oasis vision, Diamond Capital Oasis mission, environmental policy, green cleaning",
    canonicalPath: "/vision-mission.html",
  },
  {
    key: "page:contact",
    entityType: "page",
    entityId: "contact",
    label: "Contact page",
    metaTitle: "Contact Diamond Capital Oasis for Product Enquiries",
    metaDescription:
      "Contact Diamond Capital Oasis in the UAE, Oman or Qatar for availability, bulk pricing, technical documents and customized supply.",
    keywords:
      "contact Diamond Capital Oasis, cleaning products enquiry UAE, bulk hygiene supply",
    canonicalPath: "/contact.html",
  },
  {
    key: "page:blog",
    entityType: "page",
    entityId: "blog",
    label: "Blog page",
    metaTitle: "Professional Cleaning and Facility Care Insights",
    metaDescription:
      "Read practical guidance from Diamond Capital Oasis on professional cleaning products, facility care, washrooms and responsible hygiene supply.",
    keywords:
      "professional cleaning tips, facility care advice, hygiene products guide",
    canonicalPath: "/blog.html",
  },
];

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = seedData().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function seedData() {
  await ensureMysqlSchema();
  await withMysqlLock("hygiene_links_seed", async () => {
    const db = getDb();
    const importVersion = importedCatalog.version;
    const [existingImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, importVersion))
      .limit(1);

    if (!existingImport) {
      await db.delete(products);
      await db.delete(categories);
      await db
        .delete(seoEntries)
        .where(
          or(
            eq(seoEntries.entityType, "category"),
            eq(seoEntries.entityType, "product"),
          ),
        );
      for (const group of chunks(importedCategories)) {
        await db.insert(categories).values(group);
      }
      for (const group of chunks(importedProducts)) {
        await db.insert(products).values(group);
      }
      for (const group of chunks([...importedCategorySeo, ...importedProductSeo])) {
        await db.insert(seoEntries).values(group);
      }
      await db.insert(catalogImports).values({ version: importVersion });
    }

    const [existingHierarchyImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, categoryHierarchyVersion))
      .limit(1);
    if (!existingHierarchyImport) {
      for (const group of chunks(importedCategories)) {
        await db.insert(categories).ignore().values(group);
      }
      for (const category of importedCategories) {
        await db
          .update(categories)
          .set({ parentId: category.parentId })
          .where(eq(categories.id, category.id));
      }
      for (const group of chunks(importedProducts)) {
        await db.insert(products).ignore().values(group);
      }
      for (const group of chunks([...importedCategorySeo, ...importedProductSeo])) {
        await db.insert(seoEntries).ignore().values(group);
      }
      await db.insert(catalogImports).ignore().values({ version: categoryHierarchyVersion });
    }

    for (const block of seedContent) {
      await db.insert(contentBlocks).ignore().values(block);
    }
    const [existingCatalogEditorialImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, catalogEditorialImportVersion))
      .limit(1);
    if (!existingCatalogEditorialImport) {
      for (const group of chunks(seedCatalogEditorials, 2)) {
        await db.insert(catalogEditorials).ignore().values(group);
      }
      await db
        .insert(catalogImports)
        .ignore()
        .values({ version: catalogEditorialImportVersion });
    }
    for (const setting of seedSettings) {
      await db.insert(siteSettings).ignore().values(setting);
    }
    for (const entry of seedSeoEntries) {
      await db.insert(seoEntries).ignore().values(entry);
    }

    const [existingKeywordMappingImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, keywordMappingImportVersion))
      .limit(1);
    if (!existingKeywordMappingImport) {
      for (const update of keywordSeoUpdates) {
        const [existingEntry] = await db
          .select({ keywords: seoEntries.keywords })
          .from(seoEntries)
          .where(eq(seoEntries.key, update.key))
          .limit(1);
        await db
          .update(seoEntries)
          .set({ keywords: mergeKeywords(existingEntry?.keywords, update.keywords) })
          .where(eq(seoEntries.key, update.key));
      }
      await db
        .insert(catalogImports)
        .ignore()
        .values({ version: keywordMappingImportVersion });
    }

    const [existingCategoryCanonicalImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, categoryCanonicalImportVersion))
      .limit(1);
    if (!existingCategoryCanonicalImport) {
      for (const category of importedCategories) {
        await db
          .update(seoEntries)
          .set({ canonicalPath: categoryUrl(category.slug) })
          .where(eq(seoEntries.key, `category:${category.id}`));
      }
      await db
        .insert(catalogImports)
        .ignore()
        .values({ version: categoryCanonicalImportVersion });
    }

    if (blogImportVersion && seedBlogPosts.length > 0) {
      const [existingBlogImport] = await db
        .select({ version: catalogImports.version })
        .from(catalogImports)
        .where(eq(catalogImports.version, blogImportVersion))
        .limit(1);

      if (!existingBlogImport) {
        // Imported articles are additive. INSERT IGNORE protects CMS-created or
        // previously edited records from being overwritten by a later startup.
        for (const group of chunks(seedBlogPosts, 2)) {
          await db.insert(blogPosts).ignore().values(group);
        }
        for (const group of chunks(seedBlogSeo, 5)) {
          await db.insert(seoEntries).ignore().values(group);
        }
        await db
          .insert(catalogImports)
          .ignore()
          .values({ version: blogImportVersion });
      }
    }

    const [existingSocialProfileImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, socialProfileImportVersion))
      .limit(1);
    if (!existingSocialProfileImport) {
      for (const profile of initialSocialProfiles) {
        await db
          .update(siteSettings)
          .set({ value: profile.value })
          .where(eq(siteSettings.key, profile.key));
      }
      await db.insert(catalogImports).ignore().values({ version: socialProfileImportVersion });
    }

    const [existingClientLogoImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, clientLogoImportVersion))
      .limit(1);
    if (!existingClientLogoImport) {
      for (const legacyId of legacyClientLogoIds) {
        await db.delete(clientLogos).where(eq(clientLogos.id, legacyId));
      }
      for (const group of chunks(seedClientLogos)) {
        await db.insert(clientLogos).ignore().values(group);
      }
      await db.insert(catalogImports).ignore().values({ version: clientLogoImportVersion });
    }

    for (const post of additionalBlogPosts) {
      const [existingPost] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, post.row.slug))
        .limit(1);
      if (!existingPost) {
        await db.insert(blogPosts).ignore().values(post.row);
        await db.insert(seoEntries).ignore().values(post.seo);
      }
    }

    const [existingWindowWashersFaqImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, windowWashersFaqImportVersion))
      .limit(1);

    if (!existingWindowWashersFaqImport) {
      const windowWashersPage = importedCatalogEditorials.pages?.find(
        (page) => page.type === "category" && page.slug === "window-washers",
      );
      if (windowWashersPage) {
        const [existingRow] = await db
          .select({ key: catalogEditorials.key })
          .from(catalogEditorials)
          .where(eq(catalogEditorials.key, "category:window-washers"))
          .limit(1);

        if (existingRow) {
          await db
            .update(catalogEditorials)
            .set({
              blocksJson: JSON.stringify(windowWashersPage.blocks),
              updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
            })
            .where(eq(catalogEditorials.key, "category:window-washers"));
        } else {
          await db.insert(catalogEditorials).ignore().values({
            key: "category:window-washers",
            pageType: "category",
            slug: "window-washers",
            label:
              importedCategoryNames.get("window-washers") || "Window Washers",
            blocksJson: JSON.stringify(windowWashersPage.blocks),
            sortOrder: 0,
          });
        }
      }

      const [existingSeo] = await db
        .select({ keywords: seoEntries.keywords })
        .from(seoEntries)
        .where(eq(seoEntries.key, "category:import-cat-window-washers"))
        .limit(1);

      if (existingSeo) {
        await db
          .update(seoEntries)
          .set({
            keywords: mergeKeywords(
              existingSeo.keywords,
              "window cleaning suppliers, window washers suppliers in uae",
            ),
          })
          .where(eq(seoEntries.key, "category:import-cat-window-washers"));
      }

      await db
        .insert(catalogImports)
        .ignore()
        .values({ version: windowWashersFaqImportVersion });
    }

    const [existingGoogleVerificationImport] = await db
      .select({ version: catalogImports.version })
      .from(catalogImports)
      .where(eq(catalogImports.version, googleVerificationImportVersion))
      .limit(1);

    if (!existingGoogleVerificationImport) {
      await db
        .update(siteSettings)
        .set({ value: "RaAzq6JSBe41dVSgbY8_xdiBZrZjvZb_Jav1z7e2k7c" })
        .where(
          and(
            eq(siteSettings.key, "google_site_verification"),
            or(eq(siteSettings.value, ""), eq(siteSettings.value, "#")),
          ),
        );

      await db
        .insert(catalogImports)
        .ignore()
        .values({ version: googleVerificationImportVersion });
    }
  });
}

function toRecord<T extends { key: string; value: string }>(rows: T[]) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function getFallbackSiteData() {
  const fallbackSettings: SiteSetting[] = seedSettings.map((s) => ({
    id: s.key,
    key: s.key,
    value: s.value ?? "",
    label: s.label,
    groupName: "general",
    inputType: "text",
    sortOrder: s.sortOrder ?? 0,
    updatedAt: new Date().toISOString(),
  }));
  const fallbackContent: ContentBlock[] = seedContent.map((c) => ({
    id: c.key,
    key: c.key,
    value: c.value ?? "",
    label: c.label,
    groupName: "general",
    inputType: "text",
    sortOrder: c.sortOrder ?? 0,
    updatedAt: new Date().toISOString(),
  }));
  const fallbackSeo: SeoEntry[] = seedSeoEntries.map((e) => ({
    id: e.key,
    key: e.key,
    label: e.label,
    entityType: e.entityType,
    entityId: e.entityId,
    metaTitle: e.metaTitle ?? "",
    metaDescription: e.metaDescription ?? "",
    keywords:
      (Array.isArray(e.keywords) ? e.keywords.join(", ") : e.keywords) ?? "",
    canonicalPath: e.canonicalPath ?? "",
    ogTitle: e.ogTitle ?? "",
    ogDescription: e.ogDescription ?? "",
    robotsIndex: e.robotsIndex ?? true,
    updatedAt: new Date().toISOString(),
  }));

  const nowIso = new Date().toISOString();

  const fallbackCategories: Category[] = importedCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    parentId: c.parentId ?? null,
    imageUrl: c.imageUrl ?? "",
    accent: c.accent ?? "blue",
    featured: c.featured ?? false,
    sortOrder: c.sortOrder ?? 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const fallbackProducts: Product[] = importedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? "",
    categoryId: p.categoryId,
    summary: p.summary ?? "",
    description: p.description ?? "",
    imageUrl: p.imageUrl ?? "",
    packSize: p.packSize ?? "",
    applications: p.applications ?? "",
    featured: p.featured ?? false,
    eco: p.eco ?? false,
    status: p.status ?? "published",
    sortOrder: p.sortOrder ?? 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const fallbackEditorials: CatalogEditorial[] = seedCatalogEditorials.map((ed) => ({
    key: ed.key,
    pageType: ed.pageType,
    slug: ed.slug,
    label: ed.label,
    blocksJson: ed.blocksJson,
    sortOrder: ed.sortOrder ?? 0,
    updatedAt: nowIso,
  }));

  const allSeoEntries: SeoEntry[] = [
    ...fallbackSeo,
    ...importedCategorySeo.map((e) => ({
      key: e.key,
      label: e.label,
      entityType: e.entityType,
      entityId: e.entityId,
      metaTitle: e.metaTitle ?? "",
      metaDescription: e.metaDescription ?? "",
      keywords: (Array.isArray(e.keywords) ? e.keywords.join(", ") : e.keywords) ?? "",
      canonicalPath: e.canonicalPath ?? "",
      ogTitle: e.ogTitle ?? "",
      ogDescription: e.ogDescription ?? "",
      robotsIndex: e.robotsIndex ?? true,
      updatedAt: nowIso,
    })),
    ...importedProductSeo.map((e) => ({
      key: e.key,
      label: e.label,
      entityType: e.entityType,
      entityId: e.entityId,
      metaTitle: e.metaTitle ?? "",
      metaDescription: e.metaDescription ?? "",
      keywords: (Array.isArray(e.keywords) ? e.keywords.join(", ") : e.keywords) ?? "",
      canonicalPath: e.canonicalPath ?? "",
      ogTitle: e.ogTitle ?? "",
      ogDescription: e.ogDescription ?? "",
      robotsIndex: e.robotsIndex ?? true,
      updatedAt: nowIso,
    })),
  ];

  const fallbackBlogs: BlogPost[] = seedBlogPosts.map((b) => ({
    id: b.id,
    slug: b.slug,
    legacySlug: b.legacySlug ?? b.slug,
    sourceUrl: b.sourceUrl ?? null,
    sourceHash: b.sourceHash ?? "",
    title: b.title,
    excerpt: b.excerpt ?? "",
    bodyHtml: b.bodyHtml,
    featuredImageUrl: b.featuredImageUrl ?? "",
    imageAlt: b.imageAlt ?? "",
    author: b.author ?? "Hygiene Links",
    category: b.category ?? "Hygiene",
    tags: b.tags ?? "",
    publishedAt: b.publishedAt ?? null,
    status: b.status ?? "published",
    featured: b.featured ?? false,
    sortOrder: b.sortOrder ?? 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const fallbackClientLogos: ClientLogo[] = seedClientLogos.map((l, idx) => ({
    id: l.id,
    name: l.name,
    imageUrl: l.imageUrl,
    websiteUrl: l.websiteUrl ?? "",
    market: l.market ?? "UAE",
    published: l.published ?? true,
    sortOrder: l.sortOrder ?? idx,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  return {
    categories: fallbackCategories,
    products: fallbackProducts,
    contentBlocks: fallbackContent,
    catalogEditorials: fallbackEditorials,
    settings: fallbackSettings,
    seoEntries: allSeoEntries,
    clientLogos: fallbackClientLogos,
    blogs: fallbackBlogs,
    content: toRecord(fallbackContent),
    setting: toRecord(fallbackSettings),
    seo: Object.fromEntries(allSeoEntries.map((entry) => [entry.key, entry])),
  };
}

export async function getSiteData() {
  try {
    await ensureSeedData();
    const db = getDb();
    const [
      categoryRows,
      productRows,
      contentRows,
      catalogEditorialRows,
      settingRows,
      seoRows,
      clientLogoRows,
      blogRows,
    ] =
      await Promise.all([
        db.select().from(categories).orderBy(asc(categories.sortOrder)),
        db.select().from(products).orderBy(asc(products.sortOrder)),
        db.select().from(contentBlocks).orderBy(asc(contentBlocks.sortOrder)),
        db
          .select()
          .from(catalogEditorials)
          .orderBy(asc(catalogEditorials.sortOrder)),
        db.select().from(siteSettings).orderBy(asc(siteSettings.sortOrder)),
        db.select().from(seoEntries),
        db.select().from(clientLogos).orderBy(asc(clientLogos.sortOrder)),
        db
          .select()
          .from(blogPosts)
          .orderBy(desc(blogPosts.publishedAt), asc(blogPosts.sortOrder)),
      ]);

    return {
      categories: categoryRows,
      products: productRows,
      contentBlocks: contentRows,
      catalogEditorials: catalogEditorialRows,
      settings: settingRows,
      seoEntries: seoRows,
      clientLogos: clientLogoRows,
      blogs: blogRows,
      content: toRecord(contentRows),
      setting: toRecord(settingRows),
      seo: Object.fromEntries(seoRows.map((entry) => [entry.key, entry])),
    };
  } catch (error) {
    console.warn("Database connection issue (falling back safely):", error);
    return getFallbackSiteData();
  }
}

const publicBlogListFields = {
  id: blogPosts.id,
  slug: blogPosts.slug,
  legacySlug: blogPosts.legacySlug,
  title: blogPosts.title,
  excerpt: blogPosts.excerpt,
  featuredImageUrl: blogPosts.featuredImageUrl,
  imageAlt: blogPosts.imageAlt,
  author: blogPosts.author,
  category: blogPosts.category,
  tags: blogPosts.tags,
  publishedAt: blogPosts.publishedAt,
  featured: blogPosts.featured,
  sortOrder: blogPosts.sortOrder,
  updatedAt: blogPosts.updatedAt,
};

const publicBlogDetailFields = {
  ...publicBlogListFields,
  bodyHtml: blogPosts.bodyHtml,
};

async function getBlogPageContext() {
  const db = getDb();
  const [contentRows, settingRows, seoRows] = await Promise.all([
    db.select().from(contentBlocks).orderBy(asc(contentBlocks.sortOrder)),
    db.select().from(siteSettings).orderBy(asc(siteSettings.sortOrder)),
    db.select().from(seoEntries),
  ]);

  return {
    contentBlocks: contentRows,
    settings: settingRows,
    seoEntries: seoRows,
    content: toRecord(contentRows),
    setting: toRecord(settingRows),
    seo: Object.fromEntries(seoRows.map((entry) => [entry.key, entry])),
  };
}

export async function getPublishedBlogPosts(options?: {
  page?: number;
  pageSize?: number;
}) {
  const requestedPage = Number(options?.page);
  const requestedPageSize = Number(options?.pageSize);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 48)
      : 12;

  try {
    await ensureSeedData();
    const db = getDb();
    const [postRows, totalRows, context] = await Promise.all([
      db
        .select(publicBlogListFields)
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(
          desc(blogPosts.publishedAt),
          asc(blogPosts.sortOrder),
          desc(blogPosts.createdAt),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ value: count() })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published")),
      getBlogPageContext(),
    ]);

    const total = Number(totalRows[0]?.value || 0);
    return {
      posts: postRows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      ...context,
    };
  } catch (error) {
    console.warn("Could not query blog posts from DB, using fallback:", error);
    const fallbackData = getFallbackSiteData();
    const published = fallbackData.blogs.filter((b) => b.status === "published");
    const total = published.length;
    const posts = published.slice((page - 1) * pageSize, page * pageSize).map((b) => ({
      id: b.id,
      slug: b.slug,
      legacySlug: b.legacySlug,
      title: b.title,
      excerpt: b.excerpt,
      featuredImageUrl: b.featuredImageUrl,
      imageAlt: b.imageAlt,
      author: b.author,
      category: b.category,
      tags: b.tags,
      publishedAt: b.publishedAt,
      featured: b.featured,
      sortOrder: b.sortOrder,
      updatedAt: b.updatedAt,
    }));
    return {
      posts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      contentBlocks: fallbackData.contentBlocks,
      settings: fallbackData.settings,
      seoEntries: fallbackData.seoEntries,
      content: fallbackData.content,
      setting: fallbackData.setting,
      seo: fallbackData.seo,
    };
  }
}

export async function getBlogPostPage(slug: string) {
  const normalized = normalizeBlogSlug(slug);
  if (!normalized) return null;

  try {
    await ensureSeedData();
    const db = getDb();
    const [postRows, context] = await Promise.all([
      db
        .select(publicBlogDetailFields)
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            or(eq(blogPosts.slug, normalized), eq(blogPosts.legacySlug, normalized)),
          ),
        )
        .limit(1),
      getBlogPageContext(),
    ]);
    const post = postRows[0];
    if (post) {
      const relatedPosts = await db
        .select(publicBlogListFields)
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            eq(blogPosts.category, post.category),
          ),
        )
        .orderBy(desc(blogPosts.publishedAt), asc(blogPosts.sortOrder))
        .limit(4);

      return {
        post,
        relatedPosts: relatedPosts.filter((entry) => entry.id !== post.id).slice(0, 3),
        seoEntry: context.seo[`blog:${post.id}`] ?? null,
        ...context,
      };
    }
  } catch (error) {
    console.warn("Could not query blog post by slug from DB, using fallback:", error);
  }

  const fallbackData = getFallbackSiteData();
  const fallbackPost = fallbackData.blogs.find(
    (b) =>
      b.status === "published" &&
      (b.slug === normalized || b.legacySlug === normalized),
  );
  if (!fallbackPost) return null;

  const post = {
    id: fallbackPost.id,
    slug: fallbackPost.slug,
    legacySlug: fallbackPost.legacySlug,
    title: fallbackPost.title,
    excerpt: fallbackPost.excerpt,
    bodyHtml: fallbackPost.bodyHtml,
    featuredImageUrl: fallbackPost.featuredImageUrl,
    imageAlt: fallbackPost.imageAlt,
    author: fallbackPost.author,
    category: fallbackPost.category,
    tags: fallbackPost.tags,
    publishedAt: fallbackPost.publishedAt,
    featured: fallbackPost.featured,
    sortOrder: fallbackPost.sortOrder,
    updatedAt: fallbackPost.updatedAt,
  };

  const related = fallbackData.blogs
    .filter(
      (b) =>
        b.status === "published" &&
        b.category === fallbackPost.category &&
        b.id !== fallbackPost.id,
    )
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      legacySlug: b.legacySlug,
      title: b.title,
      excerpt: b.excerpt,
      featuredImageUrl: b.featuredImageUrl,
      imageAlt: b.imageAlt,
      author: b.author,
      category: b.category,
      tags: b.tags,
      publishedAt: b.publishedAt,
      featured: b.featured,
      sortOrder: b.sortOrder,
      updatedAt: b.updatedAt,
    }));

  return {
    post,
    relatedPosts: related,
    seoEntry: fallbackData.seo[`blog:${fallbackPost.id}`] ?? null,
    contentBlocks: fallbackData.contentBlocks,
    settings: fallbackData.settings,
    seoEntries: fallbackData.seoEntries,
    content: fallbackData.content,
    setting: fallbackData.setting,
    seo: fallbackData.seo,
  };
}

export async function getBlogPostByLegacySlug(legacySlug: string) {
  const normalized = normalizeBlogSlug(legacySlug);
  if (!normalized) return null;

  try {
    await ensureSeedData();
    const [post] = await getDb()
      .select(publicBlogDetailFields)
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, "published"),
          eq(blogPosts.legacySlug, normalized),
        ),
      )
      .limit(1);
    if (post) return post;
  } catch (error) {
    console.warn("Could not query blog post by legacy slug from DB:", error);
  }

  const fallback = getFallbackSiteData();
  const found = fallback.blogs.find(
    (b) => b.status === "published" && b.legacySlug === normalized,
  );
  if (!found) return null;
  return {
    id: found.id,
    slug: found.slug,
    legacySlug: found.legacySlug,
    title: found.title,
    excerpt: found.excerpt,
    bodyHtml: found.bodyHtml,
    featuredImageUrl: found.featuredImageUrl,
    imageAlt: found.imageAlt,
    author: found.author,
    category: found.category,
    tags: found.tags,
    publishedAt: found.publishedAt,
    featured: found.featured,
    sortOrder: found.sortOrder,
    updatedAt: found.updatedAt,
  };
}

export async function getBlogPostBySourceUrl(sourceUrl: string) {
  const candidate = sourceUrl.trim().slice(0, 512);
  if (!candidate) return null;

  try {
    await ensureSeedData();
    const [post] = await getDb()
      .select(publicBlogDetailFields)
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, "published"),
          eq(blogPosts.sourceUrl, candidate),
        ),
      )
      .limit(1);
    if (post) return post;
  } catch (error) {
    console.warn("Could not query blog post by source url from DB:", error);
  }

  const fallback = getFallbackSiteData();
  const found = fallback.blogs.find(
    (b) => b.status === "published" && b.sourceUrl === candidate,
  );
  if (!found) return null;
  return {
    id: found.id,
    slug: found.slug,
    legacySlug: found.legacySlug,
    title: found.title,
    excerpt: found.excerpt,
    bodyHtml: found.bodyHtml,
    featuredImageUrl: found.featuredImageUrl,
    imageAlt: found.imageAlt,
    author: found.author,
    category: found.category,
    tags: found.tags,
    publishedAt: found.publishedAt,
    featured: found.featured,
    sortOrder: found.sortOrder,
    updatedAt: found.updatedAt,
  };
}

export async function getPublishedBlogSitemapEntries() {
  try {
    await ensureSeedData();
    return await getDb()
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        legacySlug: blogPosts.legacySlug,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt), asc(blogPosts.sortOrder));
  } catch (error) {
    console.warn("Could not query blog sitemap entries from DB:", error);
    const fallback = getFallbackSiteData();
    return fallback.blogs
      .filter((b) => b.status === "published")
      .map((b) => ({
        id: b.id,
        slug: b.slug,
        legacySlug: b.legacySlug,
        publishedAt: b.publishedAt,
        updatedAt: b.updatedAt,
      }));
  }
}

export async function getPublicCatalog(options?: {
  search?: string;
  category?: string;
}) {
  const data = await getSiteData();
  const search = options?.search?.trim().toLowerCase() ?? "";
  const categorySlug = options?.category?.trim() ?? "";
  const category = data.categories.find((item) => item.slug === categorySlug);
  const childIds = category
    ? data.categories
        .filter((item) => item.parentId === category.id)
        .map((item) => item.id)
    : [];

  const productRows = data.products.filter((product) => {
    if (product.status !== "published") return false;
    if (
      category &&
      product.categoryId !== category.id &&
      !childIds.includes(product.categoryId)
    ) {
      return false;
    }
    if (
      search &&
      !`${product.name} ${product.sku} ${product.summary} ${product.applications}`
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }
    return true;
  });

  return { ...data, products: productRows, activeCategory: category ?? null };
}

export async function getCategoryPage(slug: string) {
  const data = await getSiteData();
  const category = data.categories.find((item) => item.slug === slug);
  if (!category) return null;
  const children = data.categories.filter((item) => item.parentId === category.id);
  const ids = [category.id, ...children.map((item) => item.id)];
  return {
    ...data,
    category,
    children,
    products: data.products.filter(
      (item) => item.status === "published" && ids.includes(item.categoryId),
    ),
  };
}

export async function getProductPage(slug: string) {
  const data = await getSiteData();
  const product = data.products.find(
    (item) => item.slug === slug && item.status === "published",
  );
  if (!product) return null;
  const category = data.categories.find((item) => item.id === product.categoryId);
  const parentCategory = category?.parentId
    ? data.categories.find((item) => item.id === category.parentId)
    : null;
  const relatedProducts = data.products
    .filter(
      (item) =>
        item.status === "published" &&
        item.categoryId === product.categoryId &&
        item.id !== product.id,
    )
    .slice(0, 3);
  return { ...data, product, category, parentCategory, relatedProducts };
}

export async function getRecentInquiries(limit = 20) {
  try {
    await ensureSeedData();
    return await getDb()
      .select()
      .from(inquiries)
      .orderBy(desc(inquiries.createdAt))
      .limit(limit);
  } catch (error) {
    console.warn("Could not query inquiries from DB:", error);
    return [];
  }
}

export async function getProductById(id: string) {
  try {
    await ensureSeedData();
    const [product] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (product) return product;
  } catch (error) {
    console.warn("Could not query product by id from DB:", error);
  }
  const fallback = getFallbackSiteData();
  return fallback.products.find((p) => p.id === id) ?? null;
}
