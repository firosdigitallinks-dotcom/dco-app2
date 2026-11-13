import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CatalogEditorial } from "../../../components/CatalogEditorial";
import { CategorySidebar } from "../../../components/CategorySidebar";
import { ProductCard } from "../../../components/ProductCard";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";
import { getCategoryPage } from "../../../db/site";
import { getCatalogEditorial } from "../../../lib/catalog-editorial";
import { categoryUrl as categoryPath } from "../../../lib/category-url";
import {
  absoluteUrl,
  buildPageMetadata,
  jsonLd,
  stripHtmlExtension,
} from "../../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: requestedSlug } = await params;
  const slug = stripHtmlExtension(requestedSlug);
  const data = await getCategoryPage(slug);
  if (!data) return { title: "Category not found" };
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo[`category:${data.category.id}`],
    fallbackTitle: `${data.category.name} | Diamond Capital Oasis`,
    fallbackDescription: data.category.description,
    canonicalPath: categoryPath(data.category.slug),
    image: data.category.imageUrl || undefined,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: requestedSlug } = await params;
  const slug = stripHtmlExtension(requestedSlug);
  const data = await getCategoryPage(slug);
  if (!data) notFound();
  if (requestedSlug !== `${data.category.slug}.html`) {
    permanentRedirect(categoryPath(data.category.slug));
  }
  const editorial = getCatalogEditorial(
    "category",
    data.category.slug,
    data.catalogEditorials,
  );
  const categorySummary =
    data.category.description
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .find(Boolean) ??
    `Explore ${data.category.name} products from Diamond Capital Oasis.`;
  const categoryNames = new Map(
    data.categories.map((category) => [category.id, category.name]),
  );
  const whatsapp = data.setting.whatsapp ?? "971505689879";
  const categoryUrl = absoluteUrl(
    data.setting,
    categoryPath(data.category.slug),
  );
  const categorySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: data.category.name,
    description: data.category.description,
    url: categoryUrl,
    image: data.category.imageUrl
      ? absoluteUrl(data.setting, data.category.imageUrl)
      : undefined,
    isPartOf: {
      "@id": `${absoluteUrl(data.setting, "/")}#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: data.products.length,
      itemListElement: data.products.slice(0, 50).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(data.setting, `/product/${product.slug}.html`),
        name: product.name,
      })),
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl(data.setting, "/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: absoluteUrl(data.setting, "/catalog.html"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: data.category.name,
        item: categoryUrl,
      },
    ],
  };

  const faqBlocks: { question: string; answer: string }[] = [];
  if (editorial?.blocks) {
    let inFaq = false;
    for (let i = 0; i < editorial.blocks.length; i++) {
      const b = editorial.blocks[i];
      if (
        b.type === "heading" &&
        /^(?:faq|frequently asked questions)$/i.test(b.text.trim())
      ) {
        inFaq = true;
        continue;
      }
      if (inFaq) {
        if (
          (b.type === "heading" || b.type === "paragraph") &&
          b.text.endsWith("?")
        ) {
          const next = editorial.blocks[i + 1];
          if (next && next.type === "paragraph" && !next.text.endsWith("?")) {
            faqBlocks.push({ question: b.text, answer: next.text });
            i++;
          }
        }
      }
    }
  }

  const faqSchema =
    faqBlocks.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: `${data.category.name} FAQs`,
          url: categoryUrl,
          mainEntity: faqBlocks.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(categorySchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
        />
      )}
      <SiteHeader settings={data.setting} />
      <main>
        <section
          className={`category-hero category-hero--${data.category.accent}`}
        >
          <div className="shell category-hero__grid">
            <div>
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <a href="/catalog.html">Products</a>
                <span>/</span>
                <span>{data.category.name}</span>
              </div>
              <p className="eyebrow">PROFESSIONAL RANGE</p>
              <h1>{data.category.name}</h1>
              <p>{categorySummary}</p>
            </div>
            <div className="category-hero__visual">
              {data.category.imageUrl ? (
                <img
                  src={data.category.imageUrl}
                  alt={data.category.name}
                  width="500"
                  height="480"
                />
              ) : (
                <span>
                  {data.category.name
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")}
                </span>
              )}
            </div>
          </div>
        </section>

        {data.children.length > 0 && (
          <section className="subcategory-strip">
            <div className="shell">
              <span>Explore subcategories</span>
              <div>
                {data.children.map((child) => (
                  <a key={child.id} href={categoryPath(child.slug)}>
                    {child.name} <b>↗</b>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {!editorial?.blocks.length && data.category.description && (
          <section className="category-editorial">
            <div className="shell category-editorial__inner">
              <div>
                <p className="eyebrow">CATEGORY OVERVIEW</p>
                <h2>About {data.category.name}</h2>
              </div>
              <div className="category-editorial__content">
                {data.category.description
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${data.category.id}-${index}`}>{paragraph}</p>
                  ))}
              </div>
            </div>
          </section>
        )}

        <section className="section section--mist category-products">
          <div className="shell catalog-layout">
            <CategorySidebar
              categories={data.categories}
              activeCategorySlug={data.category.slug}
            />
            <div>
              <div className="section-heading section-heading--split">
                <div>
                  <p className="eyebrow">CATALOG RANGE</p>
                  <h2>Products in {data.category.name}</h2>
                </div>
                <p>
                  Every product can be enquired about directly through email or
                  WhatsApp, with product details included automatically.
                </p>
              </div>
              {data.products.length ? (
                <div className="product-grid">
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
                  <h2>This range is ready for products.</h2>
                  <p>Add the first product through the CMS, or ask our team directly.</p>
                  <a className="button button--primary" href="/contact.html">
                    Contact our team
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {editorial && editorial.blocks.length > 0 && (
          <CatalogEditorial page={editorial} pageTitle={data.category.name} />
        )}
      </main>
      <SiteFooter settings={data.setting} />
    </>
  );
}
