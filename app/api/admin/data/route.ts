import { eq } from "drizzle-orm";
import { databaseTimestamp, getDb } from "../../../../db";
import {
  ensureSeedData,
  getRecentInquiries,
  getSiteData,
} from "../../../../db/site";
import {
  blogPosts,
  catalogEditorials,
  categories,
  clientLogos,
  contentBlocks,
  inquiries,
  products,
  seoEntries,
  siteSettings,
} from "../../../../db/schema";
import {
  cmsErrorResponse,
  requireCmsApi,
} from "../../../../lib/admin-auth";
import {
  legacyBlogPath,
  normalizeBlogSlug,
  sanitizeBlogHtml,
  sanitizeBlogText,
} from "../../../../lib/blog-content";
import { categoryUrl } from "../../../../lib/category-url";
import { slugify } from "../../../../lib/links";
import { validateJsonRequest } from "../../../../lib/request-security";

export const dynamic = "force-dynamic";

function text(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boolean(value: unknown) {
  return value === true || value === 1 || value === "true";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function id(value: unknown) {
  const parsed = text(value, 100);
  return parsed || crypto.randomUUID();
}

class BlogInputError extends Error {}
class CatalogEditorialInputError extends Error {}

function catalogEditorialBlocks(value: unknown) {
  if (!Array.isArray(value)) {
    throw new CatalogEditorialInputError("Page content blocks are required.");
  }
  if (value.length > 1_000) {
    throw new CatalogEditorialInputError(
      "A page can contain no more than 1,000 content blocks.",
    );
  }

  const blocks: Array<
    | { type: "heading"; level: 2 | 3; text: string }
    | { type: "paragraph" | "list-item"; text: string }
  > = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new CatalogEditorialInputError("Each page content block is invalid.");
    }
    const block = candidate as Record<string, unknown>;
    if (typeof block.text !== "string") {
      throw new CatalogEditorialInputError("Every content block must contain text.");
    }
    const blockText = block.text.trim();
    if (!blockText) continue;
    if (blockText.length > 20_000) {
      throw new CatalogEditorialInputError(
        "A single content block cannot exceed 20,000 characters.",
      );
    }
    if (block.type === "paragraph" || block.type === "list-item") {
      blocks.push({ type: block.type, text: blockText });
      continue;
    }
    if (
      block.type === "heading" &&
      (block.level === 2 || block.level === 3)
    ) {
      blocks.push({ type: "heading", level: block.level, text: blockText });
      continue;
    }
    throw new CatalogEditorialInputError("A page content block type is invalid.");
  }

  const serialized = JSON.stringify(blocks);
  if (serialized.length > 1_000_000) {
    throw new CatalogEditorialInputError(
      "The complete page content cannot exceed 1,000,000 characters.",
    );
  }
  return serialized;
}

function blogText(
  value: unknown,
  label: string,
  maxLength: number,
  required = false,
) {
  if (value === undefined || value === null) {
    if (required) throw new BlogInputError(`${label} is required.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new BlogInputError(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new BlogInputError(
      `${label} must be ${maxLength.toLocaleString("en")} characters or fewer.`,
    );
  }
  const sanitized = sanitizeBlogText(trimmed, maxLength);
  if (required && !sanitized) {
    throw new BlogInputError(`${label} is required.`);
  }
  return sanitized;
}

function blogBoolean(value: unknown, label: string, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") {
    throw new BlogInputError(`${label} must be true or false.`);
  }
  return value;
}

function blogInteger(value: unknown, label: string, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < -1_000_000 ||
    value > 1_000_000
  ) {
    throw new BlogInputError(
      `${label} must be a whole number between -1,000,000 and 1,000,000.`,
    );
  }
  return value;
}

function blogAssetUrl(value: unknown) {
  const url = blogText(value, "Featured image URL", 1_000);
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // The validation error below is intentionally field-specific.
  }
  throw new BlogInputError(
    "Featured image URL must be a site path or a complete HTTP(S) URL.",
  );
}

function blogPublishedAt(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 40) {
    throw new BlogInputError("Published date is invalid.");
  }

  const candidate = value.trim();
  if (!candidate) return null;
  const localMatch = candidate.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4] || 0);
    const minute = Number(localMatch[5] || 0);
    const second = Number(localMatch[6] || 0);
    const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (
      year >= 1000 &&
      year <= 9999 &&
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day &&
      check.getUTCHours() === hour &&
      check.getUTCMinutes() === minute &&
      check.getUTCSeconds() === second
    ) {
      return `${localMatch[1]}-${localMatch[2]}-${localMatch[3]} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
    }
    throw new BlogInputError("Published date is invalid.");
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.valueOf())) {
    throw new BlogInputError("Published date is invalid.");
  }
  const year = parsed.getUTCFullYear();
  if (year < 1000 || year > 9999) {
    throw new BlogInputError("Published date is invalid.");
  }
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    cause?: unknown;
  };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.errno === 1062 ||
    (candidate.cause !== error && isDuplicateKeyError(candidate.cause))
  );
}

export async function GET(request: Request) {
  try {
    await requireCmsApi(request);
    const [data, inquiryRows] = await Promise.all([
      getSiteData(),
      getRecentInquiries(),
    ]);
    return Response.json({ ...data, inquiries: inquiryRows });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireCmsApi(request);
    const invalidRequest = validateJsonRequest(request, 3 * 1024 * 1024);
    if (invalidRequest) return invalidRequest;
    await ensureSeedData();
    const body = (await request.json()) as {
      action?: string;
      payload?: Record<string, unknown>;
    };
    const action = text(body.action, 60);
    const payload = body.payload ?? {};
    const db = getDb();
    const now = databaseTimestamp();

    if (action === "saveProduct") {
      const productId = id(payload.id);
      const name = text(payload.name, 160);
      const sku = text(payload.sku, 80).toUpperCase();
      const categoryId = text(payload.categoryId, 100);
      if (!name || !sku || !categoryId) {
        return Response.json(
          { error: "Product name, SKU and category are required." },
          { status: 400 },
        );
      }

      const record = {
        id: productId,
        name,
        slug: slugify(text(payload.slug, 100) || name),
        sku,
        categoryId,
        summary: text(payload.summary, 500),
        description: text(payload.description, 5000),
        imageUrl: text(payload.imageUrl, 1000),
        packSize: text(payload.packSize, 300),
        applications: text(payload.applications, 500),
        featured: boolean(payload.featured),
        eco: boolean(payload.eco),
        status: text(payload.status, 20) === "draft" ? "draft" : "published",
        sortOrder: number(payload.sortOrder),
        updatedAt: now,
      } as const;

      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (existing) {
        await db.update(products).set(record).where(eq(products.id, productId));
      } else {
        await db.insert(products).values({ ...record, createdAt: now });
      }
      await db
        .insert(seoEntries)
        .values({
          key: `product:${productId}`,
          entityType: "product",
          entityId: productId,
          label: name,
          metaTitle: text(payload.metaTitle, 160),
          metaDescription: text(payload.metaDescription, 500),
          keywords: text(payload.keywords, 500),
          canonicalPath: `/product/${record.slug}.html`,
          ogTitle: text(payload.ogTitle, 160),
          ogDescription: text(payload.ogDescription, 500),
          robotsIndex: boolean(payload.robotsIndex),
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            label: name,
            metaTitle: text(payload.metaTitle, 160),
            metaDescription: text(payload.metaDescription, 500),
            keywords: text(payload.keywords, 500),
            canonicalPath: `/product/${record.slug}.html`,
            ogTitle: text(payload.ogTitle, 160),
            ogDescription: text(payload.ogDescription, 500),
            robotsIndex: boolean(payload.robotsIndex),
            updatedAt: now,
          },
        });
      return Response.json({ ok: true, id: productId });
    }

    if (action === "deleteProduct") {
      const productId = text(payload.id, 100);
      await Promise.all([
        db.delete(products).where(eq(products.id, productId)),
        db
          .delete(seoEntries)
          .where(eq(seoEntries.key, `product:${productId}`)),
      ]);
      return Response.json({ ok: true });
    }

    if (action === "saveBlogPost") {
      const suppliedId = blogText(payload.id, "Blog post ID", 100);
      const blogPostId = suppliedId || crypto.randomUUID();
      const title = blogText(payload.title, "Blog title", 500, true);
      const suppliedSlug = blogText(payload.slug, "Blog slug", 300);
      const slug = normalizeBlogSlug(suppliedSlug || title);
      if (!slug) {
        throw new BlogInputError(
          "Blog slug must contain at least one letter or number.",
        );
      }

      const status = blogText(payload.status, "Blog status", 20) || "draft";
      if (status !== "draft" && status !== "published") {
        throw new BlogInputError(
          "Blog status must be either draft or published.",
        );
      }

      if (typeof payload.bodyHtml !== "string") {
        throw new BlogInputError("Blog content must be HTML text.");
      }
      if (payload.bodyHtml.length > 2_000_000) {
        throw new BlogInputError(
          "Blog content must be 2,000,000 characters or fewer.",
        );
      }
      const bodyHtml = sanitizeBlogHtml(payload.bodyHtml);
      if (status === "published" && !sanitizeBlogText(bodyHtml, 1)) {
        throw new BlogInputError(
          "Published blog posts must include readable content.",
        );
      }

      const excerpt = blogText(payload.excerpt, "Blog excerpt", 1_000);
      const featuredImageUrl = blogAssetUrl(payload.featuredImageUrl);
      const imageAlt =
        blogText(payload.imageAlt, "Featured image alternative text", 500) ||
        title;
      const author =
        blogText(payload.author, "Blog author", 255) || "Hygiene Links";
      const category =
        blogText(payload.category, "Blog category", 100) || "Insights";
      const tags = blogText(payload.tags, "Blog tags", 2_000);
      const publishedAt = blogPublishedAt(payload.publishedAt);
      const featured = blogBoolean(payload.featured, "Featured post");
      const sortOrder = blogInteger(payload.sortOrder, "Sort order");

      const metaTitle =
        blogText(payload.metaTitle, "Meta title", 160) || title.slice(0, 160);
      const metaDescription =
        blogText(payload.metaDescription, "Meta description", 500) || excerpt;
      const keywords = blogText(payload.keywords, "SEO keywords", 500);
      const ogTitle =
        blogText(payload.ogTitle, "Open Graph title", 160) || metaTitle;
      const ogDescription =
        blogText(payload.ogDescription, "Open Graph description", 500) ||
        metaDescription;
      const robotsIndex =
        status === "published" &&
        blogBoolean(payload.robotsIndex, "Search engine indexing", true);
      const canonicalPath = legacyBlogPath(slug);

      const [existing] = await db
        .select({
          id: blogPosts.id,
          legacySlug: blogPosts.legacySlug,
          sourceUrl: blogPosts.sourceUrl,
          sourceHash: blogPosts.sourceHash,
        })
        .from(blogPosts)
        .where(eq(blogPosts.id, blogPostId))
        .limit(1);

      const [slugOwnerRows, legacySlugOwnerRows] = await Promise.all([
        db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, slug))
          .limit(1),
        db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.legacySlug, slug))
          .limit(1),
      ]);
      if (
        slugOwnerRows.some((row) => row.id !== blogPostId) ||
        legacySlugOwnerRows.some((row) => row.id !== blogPostId)
      ) {
        return Response.json(
          {
            error: "Another blog post already uses this URL slug.",
            field: "slug",
          },
          { status: 409 },
        );
      }

      const legacySlug = existing?.legacySlug || slug;
      const record = {
        id: blogPostId,
        slug,
        legacySlug,
        sourceUrl: existing?.sourceUrl || `cms:${blogPostId}`,
        sourceHash: existing?.sourceHash || "",
        title,
        excerpt,
        bodyHtml,
        featuredImageUrl,
        imageAlt,
        author,
        category,
        tags,
        publishedAt,
        status,
        featured,
        sortOrder,
        updatedAt: now,
      } as const;

      try {
        await db.transaction(async (transaction) => {
          if (existing) {
            await transaction
              .update(blogPosts)
              .set(record)
              .where(eq(blogPosts.id, blogPostId));
          } else {
            await transaction
              .insert(blogPosts)
              .values({ ...record, createdAt: now });
          }

          await transaction
            .insert(seoEntries)
            .values({
              key: `blog:${blogPostId}`,
              entityType: "blog",
              entityId: blogPostId,
              label: title.slice(0, 255),
              metaTitle,
              metaDescription,
              keywords,
              canonicalPath,
              ogTitle,
              ogDescription,
              robotsIndex,
              updatedAt: now,
            })
            .onDuplicateKeyUpdate({
              set: {
                label: title.slice(0, 255),
                metaTitle,
                metaDescription,
                keywords,
                canonicalPath,
                ogTitle,
                ogDescription,
                robotsIndex,
                updatedAt: now,
              },
            });
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return Response.json(
            {
              error: "Another blog post already uses this URL slug.",
              field: "slug",
            },
            { status: 409 },
          );
        }
        throw error;
      }

      return Response.json({
        ok: true,
        id: blogPostId,
        slug,
        canonicalPath,
      });
    }

    if (action === "archiveBlogPost") {
      const blogPostId = blogText(
        payload.id,
        "Blog post ID",
        100,
        true,
      );
      const [existing] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.id, blogPostId))
        .limit(1);
      if (!existing) {
        return Response.json(
          { error: "Blog post was not found." },
          { status: 404 },
        );
      }

      await db.transaction(async (transaction) => {
        await transaction
          .update(blogPosts)
          .set({ status: "archived", featured: false, updatedAt: now })
          .where(eq(blogPosts.id, blogPostId));
        await transaction
          .update(seoEntries)
          .set({ robotsIndex: false, updatedAt: now })
          .where(eq(seoEntries.key, `blog:${blogPostId}`));
      });

      return Response.json({ ok: true, id: blogPostId, archived: true });
    }

    if (action === "saveCategory") {
      const categoryId = id(payload.id);
      const name = text(payload.name, 160);
      if (!name) {
        return Response.json(
          { error: "Category name is required." },
          { status: 400 },
        );
      }
      const parentId = text(payload.parentId, 100) || null;
      if (parentId === categoryId) {
        return Response.json(
          { error: "A category cannot be its own parent." },
          { status: 400 },
        );
      }
      const record = {
        id: categoryId,
        name,
        slug: slugify(text(payload.slug, 100) || name),
        description: text(payload.description, 2000),
        parentId,
        imageUrl: text(payload.imageUrl, 1000),
        accent: text(payload.accent, 30) || "blue",
        featured: boolean(payload.featured),
        sortOrder: number(payload.sortOrder),
        updatedAt: now,
      };
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (existing) {
        await db
          .update(categories)
          .set(record)
          .where(eq(categories.id, categoryId));
      } else {
        await db.insert(categories).values({ ...record, createdAt: now });
      }
      await db
        .insert(seoEntries)
        .values({
          key: `category:${categoryId}`,
          entityType: "category",
          entityId: categoryId,
          label: name,
          metaTitle: text(payload.metaTitle, 160),
          metaDescription: text(payload.metaDescription, 500),
          keywords: text(payload.keywords, 500),
          canonicalPath: categoryUrl(record.slug),
          ogTitle: text(payload.ogTitle, 160),
          ogDescription: text(payload.ogDescription, 500),
          robotsIndex: boolean(payload.robotsIndex),
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            label: name,
            metaTitle: text(payload.metaTitle, 160),
            metaDescription: text(payload.metaDescription, 500),
            keywords: text(payload.keywords, 500),
            canonicalPath: categoryUrl(record.slug),
            ogTitle: text(payload.ogTitle, 160),
            ogDescription: text(payload.ogDescription, 500),
            robotsIndex: boolean(payload.robotsIndex),
            updatedAt: now,
          },
        });
      return Response.json({ ok: true, id: categoryId });
    }

    if (action === "deleteCategory") {
      const categoryId = text(payload.id, 100);
      const [assignedProduct, child] = await Promise.all([
        db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.categoryId, categoryId))
          .limit(1),
        db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.parentId, categoryId))
          .limit(1),
      ]);
      if (assignedProduct.length || child.length) {
        return Response.json(
          {
            error:
              "Move its products and subcategories before deleting this category.",
          },
          { status: 409 },
        );
      }
      await Promise.all([
        db.delete(categories).where(eq(categories.id, categoryId)),
        db
          .delete(seoEntries)
          .where(eq(seoEntries.key, `category:${categoryId}`)),
      ]);
      return Response.json({ ok: true });
    }

    if (action === "saveClientLogo") {
      const clientLogoId = id(payload.id);
      const name = text(payload.name, 160);
      const imageUrl = text(payload.imageUrl, 1000);
      if (!name || !imageUrl) {
        return Response.json(
          { error: "Client name and logo image are required." },
          { status: 400 },
        );
      }
      const record = {
        id: clientLogoId,
        name,
        imageUrl,
        websiteUrl: text(payload.websiteUrl, 1000),
        market: text(payload.market, 40) || "UAE",
        published: boolean(payload.published),
        sortOrder: number(payload.sortOrder, 100),
        updatedAt: now,
      };
      const [existing] = await db
        .select({ id: clientLogos.id })
        .from(clientLogos)
        .where(eq(clientLogos.id, clientLogoId))
        .limit(1);
      if (existing) {
        await db
          .update(clientLogos)
          .set(record)
          .where(eq(clientLogos.id, clientLogoId));
      } else {
        await db.insert(clientLogos).values({ ...record, createdAt: now });
      }
      return Response.json({ ok: true, id: clientLogoId });
    }

    if (action === "deleteClientLogo") {
      const clientLogoId = text(payload.id, 100);
      await db.delete(clientLogos).where(eq(clientLogos.id, clientLogoId));
      return Response.json({ ok: true });
    }

    if (action === "saveContent") {
      const values = payload.values;
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        return Response.json(
          { error: "Content values are required." },
          { status: 400 },
        );
      }
      for (const [key, value] of Object.entries(values)) {
        await db
          .update(contentBlocks)
          .set({ value: text(value, 5000), updatedAt: now })
          .where(eq(contentBlocks.key, key));
      }
      return Response.json({ ok: true });
    }

    if (action === "saveCatalogEditorial") {
      const editorialKey = text(payload.key, 191);
      if (!editorialKey) {
        return Response.json(
          { error: "Select a catalog page before saving." },
          { status: 400 },
        );
      }
      const [existing] = await db
        .select({ key: catalogEditorials.key })
        .from(catalogEditorials)
        .where(eq(catalogEditorials.key, editorialKey))
        .limit(1);
      if (!existing) {
        return Response.json(
          { error: "The selected catalog page was not found." },
          { status: 404 },
        );
      }
      await db
        .update(catalogEditorials)
        .set({
          blocksJson: catalogEditorialBlocks(payload.blocks),
          updatedAt: now,
        })
        .where(eq(catalogEditorials.key, editorialKey));
      return Response.json({ ok: true });
    }

    if (action === "saveSettings") {
      const values = payload.values;
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        return Response.json(
          { error: "Setting values are required." },
          { status: 400 },
        );
      }
      for (const [key, value] of Object.entries(values)) {
        await db
          .update(siteSettings)
          .set({ value: text(value, 1000), updatedAt: now })
          .where(eq(siteSettings.key, key));
      }
      return Response.json({ ok: true });
    }

    if (action === "saveSeo") {
      const settings = payload.settings;
      const entries = payload.entries;
      if (
        !settings ||
        typeof settings !== "object" ||
        Array.isArray(settings) ||
        !entries ||
        typeof entries !== "object" ||
        Array.isArray(entries)
      ) {
        return Response.json(
          { error: "SEO settings and page entries are required." },
          { status: 400 },
        );
      }

      for (const [key, value] of Object.entries(settings)) {
        await db
          .update(siteSettings)
          .set({ value: text(value, 1000), updatedAt: now })
          .where(eq(siteSettings.key, key));
      }

      for (const [entryKey, entryValue] of Object.entries(entries)) {
        if (
          !entryValue ||
          typeof entryValue !== "object" ||
          Array.isArray(entryValue)
        ) {
          continue;
        }
        const entry = entryValue as Record<string, unknown>;
        await db
          .update(seoEntries)
          .set({
            metaTitle: text(entry.metaTitle, 160),
            metaDescription: text(entry.metaDescription, 500),
            keywords: text(entry.keywords, 500),
            canonicalPath: text(entry.canonicalPath, 500),
            ogTitle: text(entry.ogTitle, 160),
            ogDescription: text(entry.ogDescription, 500),
            robotsIndex: boolean(entry.robotsIndex),
            updatedAt: now,
          })
          .where(eq(seoEntries.key, entryKey));
      }
      return Response.json({ ok: true });
    }

    if (action === "updateInquiry") {
      const inquiryId = text(payload.id, 100);
      const status = text(payload.status, 20);
      if (!["new", "in_progress", "closed"].includes(status)) {
        return Response.json(
          { error: "Invalid enquiry status." },
          { status: 400 },
        );
      }
      await db
        .update(inquiries)
        .set({ status })
        .where(eq(inquiries.id, inquiryId));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown CMS action." }, { status: 400 });
  } catch (error) {
    if (
      error instanceof BlogInputError ||
      error instanceof CatalogEditorialInputError
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return cmsErrorResponse(error);
  }
}
