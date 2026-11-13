import { sql } from "drizzle-orm";
import {
  boolean,
  datetime,
  index,
  int,
  longtext,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const createdAt = () =>
  datetime("created_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () =>
  datetime("updated_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

export const categories = mysqlTable(
  "categories",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    description: text("description").notNull().$defaultFn(() => ""),
    parentId: varchar("parent_id", { length: 100 }),
    imageUrl: varchar("image_url", { length: 1000 }).notNull().$defaultFn(() => ""),
    accent: varchar("accent", { length: 30 }).notNull().default("blue"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_idx").on(table.parentId),
    index("categories_sort_idx").on(table.sortOrder),
  ],
);

export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    categoryId: varchar("category_id", { length: 100 }).notNull(),
    summary: text("summary").notNull().$defaultFn(() => ""),
    description: text("description").notNull().$defaultFn(() => ""),
    imageUrl: varchar("image_url", { length: 1000 }).notNull().$defaultFn(() => ""),
    packSize: varchar("pack_size", { length: 300 }).notNull().$defaultFn(() => ""),
    applications: text("applications").notNull().$defaultFn(() => ""),
    featured: boolean("featured").notNull().default(false),
    eco: boolean("eco").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("published"),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    uniqueIndex("products_sku_unique").on(table.sku),
    index("products_category_idx").on(table.categoryId),
    index("products_status_idx").on(table.status),
    index("products_sort_idx").on(table.sortOrder),
  ],
);

export const blogPosts = mysqlTable(
  "blog_posts",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    legacySlug: varchar("legacy_slug", { length: 191 }).notNull(),
    sourceUrl: varchar("source_url", { length: 512 }),
    sourceHash: varchar("source_hash", { length: 64 }).notNull().$defaultFn(() => ""),
    title: varchar("title", { length: 500 }).notNull(),
    excerpt: text("excerpt").notNull().$defaultFn(() => ""),
    bodyHtml: longtext("body_html").notNull(),
    featuredImageUrl: varchar("featured_image_url", { length: 1000 })
      .notNull()
      .$defaultFn(() => ""),
    imageAlt: varchar("image_alt", { length: 500 }).notNull().$defaultFn(() => ""),
    author: varchar("author", { length: 255 }).notNull().default("Hygiene Links"),
    category: varchar("category", { length: 100 }).notNull().default("Insights"),
    tags: text("tags").notNull().$defaultFn(() => ""),
    publishedAt: datetime("published_at", { mode: "string" }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    uniqueIndex("blog_posts_legacy_slug_unique").on(table.legacySlug),
    uniqueIndex("blog_posts_source_url_unique").on(table.sourceUrl),
    index("blog_posts_status_date_idx").on(table.status, table.publishedAt),
    index("blog_posts_featured_sort_idx").on(table.featured, table.sortOrder),
  ],
);

export const contentBlocks = mysqlTable("content_blocks", {
  key: varchar("key", { length: 191 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  value: text("value").notNull().$defaultFn(() => ""),
  groupName: varchar("group_name", { length: 100 }).notNull().default("home"),
  inputType: varchar("input_type", { length: 30 }).notNull().default("text"),
  sortOrder: int("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const catalogEditorials = mysqlTable(
  "catalog_editorials",
  {
    key: varchar("key", { length: 191 }).primaryKey(),
    pageType: varchar("page_type", { length: 20 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    blocksJson: longtext("blocks_json").notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("catalog_editorials_page_unique").on(
      table.pageType,
      table.slug,
    ),
    index("catalog_editorials_sort_idx").on(table.sortOrder),
  ],
);

export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 191 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  value: text("value").notNull().$defaultFn(() => ""),
  sortOrder: int("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const catalogImports = mysqlTable("catalog_imports", {
  version: varchar("version", { length: 191 }).primaryKey(),
  importedAt: datetime("imported_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const seoEntries = mysqlTable(
  "seo_entries",
  {
    key: varchar("key", { length: 191 }).primaryKey(),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    metaTitle: varchar("meta_title", { length: 255 }).notNull().$defaultFn(() => ""),
    metaDescription: text("meta_description").notNull().$defaultFn(() => ""),
    keywords: text("keywords").notNull().$defaultFn(() => ""),
    canonicalPath: varchar("canonical_path", { length: 1000 }).notNull().$defaultFn(() => ""),
    ogTitle: varchar("og_title", { length: 255 }).notNull().$defaultFn(() => ""),
    ogDescription: text("og_description").notNull().$defaultFn(() => ""),
    robotsIndex: boolean("robots_index").notNull().default(true),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("seo_entries_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const inquiries = mysqlTable(
  "inquiries",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    productId: varchar("product_id", { length: 100 }),
    productName: varchar("product_name", { length: 255 })
      .notNull()
      .default("General enquiry"),
    name: varchar("name", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }).notNull().$defaultFn(() => ""),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 80 }).notNull().$defaultFn(() => ""),
    message: text("message").notNull(),
    market: varchar("market", { length: 30 }).notNull().default("UAE"),
    channel: varchar("channel", { length: 30 }).notNull().default("website"),
    status: varchar("status", { length: 30 }).notNull().default("new"),
    createdAt: createdAt(),
  },
  (table) => [
    index("inquiries_created_idx").on(table.createdAt),
    index("inquiries_status_idx").on(table.status),
  ],
);

export const clientLogos = mysqlTable(
  "client_logos",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    imageUrl: varchar("image_url", { length: 1000 }).notNull(),
    websiteUrl: varchar("website_url", { length: 1000 }).notNull().$defaultFn(() => ""),
    market: varchar("market", { length: 30 }).notNull().default("UAE"),
    published: boolean("published").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("client_logos_published_sort_idx").on(
      table.published,
      table.sortOrder,
    ),
  ],
);
