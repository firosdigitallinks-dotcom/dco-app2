import type { Metadata } from "next";
import { CategoryCard } from "../CategoryCard";
import { CategorySidebar } from "../CategorySidebar";
import { ProductCard } from "../ProductCard";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { getPublicCatalog, getSiteData } from "../../db/site";
import { buildPageMetadata } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}): Promise<Metadata> {
  const [data, params] = await Promise.all([getSiteData(), searchParams]);
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo["page:catalog"],
    fallbackTitle: "Professional Cleaning & Hygiene Product Catalog",
    fallbackDescription:
      "Browse Diamond Capital Oasis cleaning chemicals, paper products, tools, washroom supplies, waste solutions, PPE and specialty products.",
    canonicalPath: "/catalog.html",
    index: !params.q && !params.category,
  });
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const data = await getPublicCatalog({
    search: params.q,
    category: params.category,
  });
  const categoryNames = new Map(
    data.categories.map((category) => [category.id, category.name]),
  );
  const topCategories = data.categories.filter((category) => !category.parentId);
  const showCategoryOverview = !params.q && !params.category;
  const whatsapp = data.setting.whatsapp ?? "971505689879";
  const title = data.activeCategory?.name ?? "The complete product catalog";
  return (
    <>
      <SiteHeader settings={data.setting} />
      <main className="catalog-page">
        <section className="page-hero page-hero--catalog">
          <div className="shell">
            <div className="breadcrumbs">
              <a href="/">Home</a>
              <span>/</span>
              <span>Products</span>
            </div>
            <div className="page-hero__grid">
              <div>
                <p className="eyebrow">PROFESSIONAL PRODUCT CATALOG</p>
                <h1>{title}</h1>
                <p>
                  Find products by range, product name or SKU, then send a
                  detailed enquiry directly by email or WhatsApp.
                </p>
              </div>
              <div className="catalog-stat">
                <strong>{data.setting.catalog_claim ?? "500+"}</strong>
                <span>products available across</span>
                <b>{data.setting.markets}</b>
              </div>
            </div>
          </div>
        </section>

        <section className="catalog-toolbar">
          <div className="shell catalog-toolbar__inner">
            <form className="catalog-search" action="/catalog.html" role="search">
              {params.category && (
                <input type="hidden" name="category" value={params.category} />
              )}
              <label htmlFor="catalog-search">
                <span>Search the catalog</span>
                <div>
                  <input
                    id="catalog-search"
                    type="search"
                    name="q"
                    defaultValue={params.q}
                    placeholder="Try “floor cleaner” or “HL-CC-132”"
                  />
                  <button type="submit">Search ↗</button>
                </div>
              </label>
            </form>
            <div className="catalog-result-count">
              <strong>
                {showCategoryOverview ? topCategories.length : data.products.length}
              </strong>
              <span>
                {showCategoryOverview ? "main categories" : "matching products"}
              </span>
            </div>
          </div>
        </section>

        <section className="section catalog-results">
          <div className="shell catalog-layout">
            <CategorySidebar
              categories={data.categories}
              activeCategorySlug={data.activeCategory?.slug}
            />

            <div>
              <div className="catalog-results__heading">
                <div>
                  <p className="eyebrow">
                    {params.q
                      ? `SEARCH: “${params.q}”`
                      : showCategoryOverview
                        ? "BROWSE MAIN CATEGORIES"
                        : "BROWSE PRODUCTS"}
                  </p>
                  <h2>
                    {showCategoryOverview ? "All product categories" : title}
                  </h2>
                </div>
                <span>
                  {showCategoryOverview
                    ? "Select a range to explore"
                    : "Bulk pricing on request"}
                </span>
              </div>
              {showCategoryOverview ? (
                <div className="category-grid category-grid--catalog">
                  {topCategories.map((category, index) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      index={index}
                    />
                  ))}
                </div>
              ) : data.products.length ? (
                <div className="product-grid product-grid--catalog">
                  {data.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryName={categoryNames.get(product.categoryId)}
                      whatsapp={whatsapp}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-results">
                  <span>0</span>
                  <h2>No products matched that search.</h2>
                  <p>
                    Try a broader product name, an SKU, or send us the item you
                    need.
                  </p>
                  <div>
                    <a className="button button--primary" href="/catalog.html">
                      View all products
                    </a>
                    <a className="button button--outline" href="/contact.html">
                      Ask our team
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={data.setting} />
    </>
  );
}
