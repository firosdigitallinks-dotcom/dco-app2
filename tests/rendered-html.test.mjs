import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("ships the Diamond Capital Oasis front page instead of the starter preview", async () => {
  const [home, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(home, /Cleaning Equipment Suppliers in Oman/);
  assert.match(home, /<SiteHeader/);
  assert.match(home, /<SiteFooter/);
  assert.match(home, /Diamond Capital Oasis/);
  assert.match(home, /About Us/);
  assert.match(home, /Product Categories/);
  assert.match(home, /Featured Products/);
  assert.match(home, /Industries We Serve/);
  assert.match(home, /Why Choose Us\?/);
  assert.match(home, /How We Work/);
  assert.match(home, /Locations We Serve/);
  assert.match(home, /Frequently Asked Questions/);
  assert.match(home, /Get a Quote for Your Business/);
  assert.match(layout, /Diamond Capital Oasis/);
  assert.match(layout, /RaAzq6JSBe41dVSgbY8_xdiBZrZjvZb_Jav1z7e2k7c/);
  assert.doesNotMatch(home, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("includes persistent CMS, enquiry and media capabilities", async () => {
  const [schema, cms, mysqlSchema, auth, media, envExample] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/AdminConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../mysql/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/media-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /categories/);
  assert.match(schema, /products/);
  assert.match(schema, /contentBlocks/);
  const siteData = await readFile(new URL("../db/site.ts", import.meta.url), "utf8");
  const footer = await readFile(
    new URL("../components/SiteFooter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(siteData, /home_about_video/);
  assert.match(siteData, /supplier_intro_title/);
  assert.match(siteData, /supplier_range_7_body/);
  assert.match(siteData, /supplier_closing_body_2/);
  assert.match(siteData, /social_facebook/);
  assert.match(siteData, /social_youtube/);
  assert.match(footer, /\/social-icons\/facebook\.png/);
  assert.match(footer, /\/social-icons\/instagram\.png/);
  assert.match(footer, /\/social-icons\/linkedin\.png/);
  assert.match(footer, /\/social-icons\/x\.png/);
  assert.match(footer, /\/social-icons\/youtube\.png/);
  assert.match(footer, /footer-contact-link/);
  assert.doesNotMatch(footer, /CMS login/);
  assert.doesNotMatch(footer, /footer-address/);
  assert.match(schema, /inquiries/);
  assert.match(schema, /seoEntries/);
  assert.match(cms, /Page content/);
  assert.match(cms, /SEO & Ads/);
  assert.match(cms, /Google Tag Manager/);
  assert.match(cms, /ga4_id/);
  assert.match(cms, /google_ads_id/);
  assert.match(cms, /meta_pixel_id/);
  assert.match(cms, /Upload JPEG, PNG or WebP/);
  assert.match(schema, /mysqlTable/);
  assert.match(mysqlSchema, /CREATE TABLE IF NOT EXISTS products/);
  assert.match(mysqlSchema, /CREATE TABLE IF NOT EXISTS client_logos/);
  assert.match(auth, /CMS_ADMIN_PASSWORD_HASH/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "strict"/);
  assert.match(media, /UPLOAD_DIR/);
  assert.match(media, /writeFile/);
  assert.match(envExample, /DB_HOST=localhost/);
  assert.match(envExample, /CMS_SESSION_SECRET/);
  assert.match(envExample, /ENQUIRY_TO_EMAIL=enquiries@hygienelinks\.com/);
});

test("uses one enquiry flow with SMTP delivery and a thank-you dialog", async () => {
  const [card, productPage, form, dialog, cart, route, mailer] =
    await Promise.all([
      readFile(new URL("../components/ProductCard.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/ContactForm.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/EnquiryDialog.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/EnquiryCart.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/api/inquiries/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/enquiry-email.ts", import.meta.url), "utf8"),
    ]);

  assert.match(card, /EnquireNowButton/);
  assert.match(productPage, /source="product-page"/);
  assert.match(cart, /openBulkEnquiryForm/);
  assert.match(form, /ENQUIRY_SUBMITTED_EVENT/);
  assert.match(dialog, /Thank you for contacting us/);
  assert.match(route, /sendEnquiryEmails/);
  assert.match(mailer, /enquiries@hygienelinks\.com/);
  assert.match(mailer, /We received your Hygiene Links enquiry/);
  assert.match(mailer, /Promise\.all/);
});

test("ships canonical html routes and technical SEO endpoints", async () => {
  const [
    header,
    catalog,
    categoryCard,
    product,
    category,
    sitemap,
    robots,
    tracking,
    nextConfig,
  ] =
    await Promise.all([
      readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/pages/CatalogPage.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/CategoryCard.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/category/[slug]/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
      readFile(new URL("../components/TrackingScripts.tsx", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    ]);

  assert.match(header, /\/catalog\.html/);
  assert.match(header, /\/about\.html/);
  assert.match(header, /\/blog\.html/);
  assert.match(header, /\/contact\.html/);
  assert.match(catalog, /All product categories/);
  assert.match(catalog, /CategoryCard/);
  assert.match(categoryCard, /View more/);
  assert.doesNotMatch(categoryCard, /productCount/);
  assert.match(product, /stripHtmlExtension/);
  assert.match(product, /permanentRedirect/);
  assert.match(product, /Product/);
  assert.match(product, /CategorySidebar/);
  assert.match(category, /stripHtmlExtension/);
  assert.match(category, /permanentRedirect/);
  assert.match(category, /CollectionPage/);
  assert.match(category, /CategorySidebar/);
  assert.doesNotMatch(category, /category-hero__meta/);
  assert.doesNotMatch(nextConfig, /source:\s*["']\/category\/:slug\.html["']/);
  assert.doesNotMatch(nextConfig, /source:\s*["']\/product\/:slug\.html["']/);
  assert.match(sitemap, /sitemap/);
  assert.match(robots, /robots_index/);
  assert.match(tracking, /googletagmanager/);
  assert.match(tracking, /facebook\.com\/tr/);
});

test("preserves mapped legacy URLs and assigns their keywords to canonical pages", async () => {
  const [mappingSource, catalogSource, nextConfig, siteData] =
    await Promise.all([
      readFile(
        new URL("../data/legacy-seo-mapping.json", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../data/imported-catalog.json", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/site.ts", import.meta.url), "utf8"),
    ]);
  const mapping = JSON.parse(mappingSource);
  const catalog = JSON.parse(catalogSource);
  const redirects = Object.entries(mapping.redirects);
  const categorySlugs = new Set(catalog.categories.map((entry) => entry.slug));
  const productSlugs = new Set(catalog.products.map((entry) => entry.slug));

  assert.equal(redirects.length, 54);
  assert.equal(Object.keys(mapping.keywords).length, 46);
  assert.equal(mapping.sourceRanges.oman, "A3:B53");
  assert.equal(mapping.sourceRanges.uae, "A2:B65");
  assert.equal(
    mapping.redirects["/products/brooms-and-mops-uae.html"],
    "/category/brooms-and-mops.html",
  );
  assert.equal(
    mapping.redirects["/furniture-polish-details.html"],
    "/product/furniture-polish.html",
  );

  for (const [source, destination] of redirects) {
    assert.notEqual(source, destination, `redirect loop for ${source}`);
    const match = destination.match(/^\/(category|product)\/([^/]+)\.html$/);
    assert.ok(match, `invalid canonical destination ${destination}`);
    const [, type, slug] = match;
    assert.ok(
      type === "category" ? categorySlugs.has(slug) : productSlugs.has(slug),
      `missing ${type} destination ${destination}`,
    );
  }

  assert.match(nextConfig, /legacySeoMapping\.redirects/);
  assert.match(nextConfig, /permanent:\s*true/);
  assert.match(siteData, /keywordMappingImportVersion/);
  assert.match(siteData, /mergeKeywords\(existingEntry\?\.keywords/);
});

test("build output contains the cPanel application, MySQL schema and social card", async () => {
  await Promise.all([
    access(new URL("../.next/BUILD_ID", import.meta.url)),
    access(new URL("../app.js", import.meta.url)),
    access(new URL("../.env.example", import.meta.url)),
    access(new URL("../mysql/schema.sql", import.meta.url)),
    access(new URL("../scripts/hash-cms-password.mjs", import.meta.url)),
    access(new URL("../storage/uploads/.gitkeep", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/social-icons/facebook.png", import.meta.url)),
    access(new URL("../public/social-icons/instagram.png", import.meta.url)),
    access(new URL("../public/social-icons/linkedin.png", import.meta.url)),
    access(new URL("../public/social-icons/x.png", import.meta.url)),
    access(new URL("../public/social-icons/youtube.png", import.meta.url)),
  ]);
});

test("imports the complete active catalog from the current public website", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../data/imported-catalog.json", import.meta.url), "utf8"),
  );
  assert.equal(catalog.stats.detailPages, 322);
  assert.equal(catalog.stats.mergedProducts, 320);
  assert.equal(catalog.stats.images, 320);
  assert.equal(new Set(catalog.products.map((product) => product.slug)).size, 320);
  assert.equal(new Set(catalog.products.map((product) => product.sku)).size, 320);
  assert.equal(catalog.categories.length, 82);

  const categoryBySlug = new Map(
    catalog.categories.map((category) => [category.slug, category]),
  );
  assert.equal(
    categoryBySlug.get("all-purpose-cleaner")?.parentId,
    "import-cat-detergent-disinfectants",
  );
  assert.equal(
    categoryBySlug.get("hand-soap")?.parentId,
    "import-cat-detergent-disinfectants",
  );
  assert.equal(
    categoryBySlug.get("waste-bin")?.parentId,
    "import-cat-waste-management-products",
  );
  assert.equal(
    categoryBySlug.get("starch-bags")?.parentId,
    "import-cat-plastic-bags",
  );
  assert.equal(
    catalog.products.filter((product) => product.categoryId === "import-cat-waste-bin")
      .length,
    2,
  );
  assert.equal(
    catalog.products.filter((product) => product.categoryId === "import-cat-starch-bags")
      .length,
    1,
  );
  assert.equal(
    catalog.products.filter((product) => product.name === "Multi Functional Janitor Cart")
      .length,
    2,
  );
  assert.ok(catalog.products.some((product) => product.slug === "swim-pool-lift"));
  await Promise.all(
    catalog.products.map((product) =>
      access(new URL(`../public${product.imageUrl}`, import.meta.url)),
    ),
  );
});

test("publishes and manages the supplied catalog copy through the CMS", async () => {
  const [
    editorial,
    categoryPage,
    productPage,
    component,
    manager,
    schema,
    mysqlSchema,
    siteData,
    adminApi,
  ] = await Promise.all([
    readFile(new URL("../data/missing-page-content.json", import.meta.url), "utf8"),
    readFile(new URL("../app/category/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CatalogEditorial.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CatalogEditorialManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../mysql/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/data/route.ts", import.meta.url), "utf8"),
  ]);
  const content = JSON.parse(editorial);

  assert.equal(content.pages.length, 33);
  assert.equal(
    new Set(content.pages.map((page) => `${page.type}:${page.slug}`)).size,
    33,
  );
  assert.ok(
    content.pages.some(
      (page) => page.type === "category" && page.slug === "glass-clothes",
    ),
  );
  assert.ok(
    content.pages.some(
      (page) => page.type === "product" && page.slug === "furniture-polish",
    ),
  );
  const windowWashers = content.pages.find(
    (page) => page.type === "category" && page.slug === "window-washers",
  );
  assert.ok(windowWashers);
  assert.ok(
    windowWashers.blocks.some(
      (block) =>
        block.text === "Do you supply window washers in bulk across the UAE?",
    ),
  );
  assert.match(editorial, /Efficiency, elegance and flexibility/);
  assert.match(editorial, /Green Disinfectant Cleaners/);
  assert.doesNotMatch(editorial, /https:\/\/(?:www\.)?hygienelinks\.com/);
  assert.doesNotMatch(editorial, /"text": "(?:Missing content|content missing|Fix structure|this page is missing)"/i);
  assert.match(categoryPage, /getCatalogEditorial\(\s*"category"/);
  assert.match(productPage, /getCatalogEditorial\(\s*"product"/);
  assert.match(component, /catalog-copy__article/);
  assert.match(manager, /Save catalog page content/);
  assert.match(manager, /Main section heading/);
  assert.match(manager, /Bullet item/);
  assert.match(schema, /catalogEditorials\s*=\s*mysqlTable/);
  assert.match(mysqlSchema, /CREATE TABLE IF NOT EXISTS catalog_editorials/);
  assert.match(siteData, /seedCatalogEditorials/);
  assert.match(siteData, /catalogEditorials:\s*catalogEditorialRows/);
  assert.match(adminApi, /action === "saveCatalogEditorial"/);
  assert.match(adminApi, /catalogEditorialBlocks\(payload\.blocks\)/);
});

test("includes direct and bulk product enquiry flows", async () => {
  const [card, productPage, cart, addButton, layout, enquiryButton] = await Promise.all([
    readFile(new URL("../components/ProductCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/EnquiryCart.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/AddToEnquiryCartButton.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/EnquireNowButton.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(card, /EnquireNowButton/);
  assert.match(enquiryButton, /Enquire Now/);
  assert.match(enquiryButton, /openEnquiryDialog/);
  assert.match(card, /AddToEnquiryCartButton/);
  assert.match(productPage, /EnquireNowButton/);
  assert.match(productPage, /variant="detail"/);
  assert.match(addButton, /Add to bulk enquiry/);
  assert.match(cart, /localStorage/);
  assert.match(cart, /Bulk enquiry cart/);
  assert.match(cart, /Enquire through WhatsApp/);
  assert.match(cart, /Complete enquiry form/);
  assert.match(cart, /Quantity/);
  assert.match(layout, /<EnquiryCart/);
  assert.match(layout, /<EnquiryDialog/);
  assert.match(layout, /<FloatingContactButtons/);
});

test("imports all current blog articles and their images without unsafe markup", async () => {
  const importedBlogs = JSON.parse(
    await readFile(new URL("../data/imported-blogs.json", import.meta.url), "utf8"),
  );
  const posts = importedBlogs.posts;

  assert.equal(importedBlogs.stats.articlePages, 109);
  assert.equal(importedBlogs.stats.images, 109);
  assert.equal(importedBlogs.stats.exactDuplicateBodies, 0);
  assert.equal(posts.length, 109);
  assert.equal(new Set(posts.map((post) => post.id)).size, 109);
  assert.equal(new Set(posts.map((post) => post.slug)).size, 109);
  assert.equal(new Set(posts.map((post) => post.legacySlug)).size, 109);
  assert.equal(new Set(posts.map((post) => post.sourceUrl)).size, 109);
  assert.equal(new Set(posts.map((post) => post.imageUrl)).size, 109);

  const unsafeTag =
    /<\s*\/?\s*(?:script|style|form|object|embed|link|meta|base|input|button|textarea|select|option|svg|math)\b/i;
  const unsafeEventAttribute = /\son[a-z0-9_-]+\s*=/i;
  const unsafeStyleAttribute = /\sstyle\s*=/i;
  const unsafeUrl = /(?:href|src)\s*=\s*["']\s*(?:javascript|vbscript|data):/i;
  const bodyDigests = new Set();

  for (const post of posts) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(post.legacySlug, post.slug);
    assert.ok(post.title.trim(), `Missing title for ${post.slug}`);
    assert.ok(post.excerpt.trim(), `Missing excerpt for ${post.slug}`);
    assert.ok(post.bodyHtml.trim(), `Missing article body for ${post.slug}`);
    assert.ok(post.imageUrl.trim(), `Missing image for ${post.slug}`);
    assert.ok(post.imageAlt.trim(), `Missing image alt text for ${post.slug}`);
    assert.match(post.imageUrl, /^\/imported-blogs\/[a-f0-9]{20}\.(?:jpe?g|png|webp)$/);
    assert.equal(post.canonicalPath, `/blog/details/${post.slug}.html`);
    assert.match(
      post.sourceUrl,
      /^https:\/\/(?:www\.)?hygienelinks\.com\/blog\/details\/.+\.html$/,
    );
    assert.match(post.bodyHash, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(post.bodyHtml, unsafeTag);
    assert.doesNotMatch(post.bodyHtml, unsafeEventAttribute);
    assert.doesNotMatch(post.bodyHtml, unsafeStyleAttribute);
    assert.doesNotMatch(post.bodyHtml, unsafeUrl);
    bodyDigests.add(createHash("sha256").update(post.bodyHtml).digest("hex"));
  }

  assert.equal(bodyDigests.size, 109, "Imported article bodies must be unique");

  const imageDirectory = new URL("../public/imported-blogs/", import.meta.url);
  const imageFiles = (await readdir(imageDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const referencedFiles = posts
    .map((post) => post.imageUrl.replace("/imported-blogs/", ""))
    .sort();

  assert.equal(imageFiles.length, 109);
  assert.deepEqual(imageFiles, referencedFiles);
  await Promise.all(
    posts.map((post) =>
      access(new URL(`../public${post.imageUrl}`, import.meta.url)),
    ),
  );
});

test("provides persistent CMS management for blog posts and per-article SEO", async () => {
  const [
    schema,
    mysqlSchema,
    runtimeSchema,
    siteData,
    adminConsole,
    adminPage,
    blogManager,
    adminApi,
    sanitizer,
  ] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../mysql/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/mysql-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/AdminConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/BlogManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/data/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/blog-content.ts", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /blogPosts\s*=\s*mysqlTable\(\s*["']blog_posts["']/);
  assert.match(schema, /bodyHtml:\s*longtext\(["']body_html["']\)/);
  assert.match(schema, /blog_posts_slug_unique/);
  assert.match(schema, /blog_posts_legacy_slug_unique/);
  assert.match(schema, /blog_posts_source_url_unique/);
  assert.match(mysqlSchema, /CREATE TABLE IF NOT EXISTS blog_posts/);
  assert.match(mysqlSchema, /body_html LONGTEXT NOT NULL/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS blog_posts/);
  assert.match(siteData, /imported-blogs\.json/);
  assert.match(siteData, /getPublishedBlogPosts/);
  assert.match(siteData, /getBlogPostPage/);
  assert.match(siteData, /getPublishedBlogSitemapEntries/);
  assert.match(siteData, /blogs:\s*blogRows/);

  assert.match(adminConsole, /["']blogs["'],\s*["']Blog posts["']/);
  assert.match(adminConsole, /<BlogManager/);
  assert.match(adminPage, /blogs:\s*data\.blogs/);
  assert.match(blogManager, /saveBlogPost/);
  assert.match(blogManager, /archiveBlogPost/);
  assert.match(blogManager, /bodyHtml/);
  assert.match(blogManager, /featuredImageUrl/);
  assert.match(blogManager, /metaTitle/);
  assert.match(blogManager, /metaDescription/);
  assert.match(blogManager, /keywords/);
  assert.match(blogManager, /robotsIndex/);

  assert.match(adminApi, /action\s*===\s*["']saveBlogPost["']/);
  assert.match(adminApi, /action\s*===\s*["']archiveBlogPost["']/);
  assert.match(adminApi, /sanitizeBlogHtml\(payload\.bodyHtml\)/);
  assert.match(adminApi, /canonicalPath\s*=\s*legacyBlogPath\(slug\)/);
  assert.match(adminApi, /key:\s*`blog:\$\{blogPostId\}`/);
  assert.match(adminApi, /status:\s*["']archived["']/);
  assert.match(sanitizer, /sanitizeHtml/);
  assert.match(sanitizer, /allowedIframeHostnames/);
  assert.match(sanitizer, /allowProtocolRelative:\s*false/);
});

test("paginates all 109 blog posts in twelve-item archive pages", async () => {
  const [listing, siteData, importedBlogs] = await Promise.all([
    readFile(new URL("../components/pages/BlogPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/imported-blogs.json", import.meta.url), "utf8"),
  ]);
  const posts = JSON.parse(importedBlogs).posts;
  const pageSizeMatch = listing.match(/const PAGE_SIZE\s*=\s*(\d+)\s*;/);

  assert.ok(pageSizeMatch, "The blog archive must declare its page size");
  const pageSize = Number(pageSizeMatch[1]);
  assert.equal(pageSize, 12);
  assert.equal(posts.length, 109);

  const totalPages = Math.ceil(posts.length / pageSize);
  const pageLengths = Array.from({ length: totalPages }, (_, index) =>
    posts.slice(index * pageSize, (index + 1) * pageSize).length,
  );
  assert.equal(totalPages, 10);
  assert.deepEqual(pageLengths, [12, 12, 12, 12, 12, 12, 12, 12, 12, 1]);

  const paginatedQueries =
    listing.match(
      /getPublishedBlogPosts\(\{\s*page,\s*pageSize:\s*PAGE_SIZE\s*\}\)/g,
    ) || [];
  assert.equal(
    paginatedQueries.length,
    2,
    "Metadata and page rendering must use the same twelve-item query",
  );
  assert.match(listing, /data\.posts\.map\(\(post\)\s*=>/);
  assert.match(listing, /page\s*>\s*data\.totalPages\)\s*notFound\(\)/);
  assert.match(listing, /blogListingPath\(page\s*-\s*1\)/);
  assert.match(listing, /blogListingPath\(page\s*\+\s*1\)/);
  assert.match(listing, /aria-current=["']page["']/);

  assert.match(siteData, /\.limit\(pageSize\)/);
  assert.match(siteData, /\.offset\(\(page\s*-\s*1\)\s*\*\s*pageSize\)/);
  assert.match(siteData, /totalPages:\s*Math\.ceil\(total\s*\/\s*pageSize\)/);
});

test("maps legacy numeric blog offsets to canonical archive pages without loops", async () => {
  const [legacyArchive, blogAlias] = await Promise.all([
    readFile(new URL("../app/blog/[offset]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/blog/page.tsx", import.meta.url), "utf8"),
  ]);

  const legacyTarget = (offset) => {
    const page = Math.floor(offset / 12) + 1;
    return page > 1 ? `/blog.html?page=${page}` : "/blog.html";
  };

  assert.deepEqual(
    [0, 4, 8, 12, 16, 20, 108].map((offset) => legacyTarget(offset)),
    [
      "/blog.html",
      "/blog.html",
      "/blog.html",
      "/blog.html?page=2",
      "/blog.html?page=2",
      "/blog.html?page=2",
      "/blog.html?page=10",
    ],
  );

  assert.match(legacyArchive, /offset\s*%\s*4\s*!==\s*0/);
  assert.match(
    legacyArchive,
    /Math\.floor\(\s*offset\s*\/\s*12\s*\)\s*\+\s*1/,
  );
  assert.match(legacyArchive, /permanentRedirect\(/);
  assert.match(legacyArchive, /`\/blog\.html\?page=\$\{page\}`/);
  assert.doesNotMatch(
    legacyArchive,
    /permanentRedirect\([^;]*\/blog\/\$\{/s,
    "A numeric archive redirect must not target the dynamic /blog/[offset] route",
  );
  assert.match(blogAlias, /permanentRedirect\(["']\/blog\.html["']\)/);
});

test("publishes self-referencing metadata for every blog archive page", async () => {
  const [listing, archiveRoute, siteData, seo] = await Promise.all([
    readFile(new URL("../components/pages/BlogPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/blog.html/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/seo.ts", import.meta.url), "utf8"),
  ]);

  const canonicalPath = (page) =>
    page > 1 ? `/blog.html?page=${page}` : "/blog.html";
  assert.equal(canonicalPath(1), "/blog.html");
  assert.equal(canonicalPath(2), "/blog.html?page=2");
  assert.equal(canonicalPath(10), "/blog.html?page=10");

  assert.match(archiveRoute, /generateMetadata/);
  assert.match(
    listing,
    /return page\s*>\s*1\s*\?\s*`\/blog\.html\?page=\$\{page\}`\s*:\s*["']\/blog\.html["']/,
  );
  assert.match(listing, /const canonicalPath\s*=\s*blogListingPath\(page\)/);
  assert.match(listing, /savedEntry\s*&&\s*page\s*>\s*1/);
  assert.match(listing, /metaTitle:[^\n]*Page \$\{page\}/);
  assert.match(listing, /ogTitle:[^\n]*Page \$\{page\}/);
  assert.match(listing, /canonicalPath,\s*\n\s*ogTitle:/);
  assert.match(listing, /buildPageMetadata\(\{[\s\S]*canonicalPath,[\s\S]*\}\)/);

  assert.match(siteData, /key:\s*["']page:blog["']/);
  assert.match(siteData, /canonicalPath:\s*["']\/blog\.html["']/);
  assert.match(seo, /alternates:\s*\{\s*canonical\s*\}/);
  assert.match(seo, /openGraph:\s*\{[\s\S]*url:\s*canonical/);
});

test("publishes exact legacy article URLs and article SEO", async () => {
  const [article, sitemap] = await Promise.all([
    readFile(
      new URL("../app/blog/details/[slug]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(article, /<h1>\{post\.title\}<\/h1>/);
  assert.match(article, /legacyBlogPath\(post\.slug\)/);
  assert.match(article, /requestedSlug\.toLowerCase\(\)\s*!==\s*`\$\{post\.slug\}\.html`/);
  assert.match(article, /permanentRedirect\(canonicalPath\)/);
  assert.match(article, /dangerouslySetInnerHTML=\{\{ __html: post\.bodyHtml \}\}/);
  assert.match(article, /["']@type["']:\s*["']BlogPosting["']/);
  assert.match(article, /["']@type["']:\s*["']BreadcrumbList["']/);
  assert.match(article, /jsonLd\(articleSchema\)/);
  assert.match(article, /jsonLd\(breadcrumbSchema\)/);
  assert.match(article, /type:\s*["']article["']/);

  assert.match(sitemap, /getPublishedBlogSitemapEntries/);
  assert.match(sitemap, /data\.seo\[`blog:\$\{post\.id\}`\]\?\.robotsIndex\s*!==\s*false/);
  assert.match(sitemap, /`\/blog\/details\/\$\{post\.slug\}\.html`/);
});
