import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AddToEnquiryCartButton } from "../../../components/AddToEnquiryCartButton";
import { CatalogEditorial } from "../../../components/CatalogEditorial";
import { CategorySidebar } from "../../../components/CategorySidebar";
import { ContactForm } from "../../../components/ContactForm";
import { EnquireNowButton } from "../../../components/EnquireNowButton";
import { ProductCard } from "../../../components/ProductCard";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";
import { WhatsAppIcon } from "../../../components/WhatsAppIcon";
import { getProductPage } from "../../../db/site";
import { getCatalogEditorial } from "../../../lib/catalog-editorial";
import { categoryUrl } from "../../../lib/category-url";
import { whatsappLink } from "../../../lib/links";
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
  const data = await getProductPage(slug);
  if (!data) return { title: "Product not found" };
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo[`product:${data.product.id}`],
    fallbackTitle: `${data.product.name} | Diamond Capital Oasis`,
    fallbackDescription: data.product.summary,
    canonicalPath: `/product/${data.product.slug}.html`,
    image: data.product.imageUrl || undefined,
    uniqueTitleQualifier: data.product.sku,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: requestedSlug } = await params;
  const slug = stripHtmlExtension(requestedSlug);
  const data = await getProductPage(slug);
  if (!data) notFound();
  if (requestedSlug !== `${data.product.slug}.html`) {
    permanentRedirect(`/product/${data.product.slug}.html`);
  }
  const { product } = data;
  const editorial = getCatalogEditorial(
    "product",
    product.slug,
    data.catalogEditorials,
  );
  const email = "info@hygienelinks.com";
  const whatsapp = data.setting.whatsapp ?? "971505689879";
  const importedDetailLines = product.applications
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const originalCodeLine = importedDetailLines.find((line) =>
    line.toLowerCase().startsWith("product code:"),
  );
  const documentLine = importedDetailLines.find((line) =>
    line.toLowerCase().startsWith("product document:"),
  );
  const displaySku = originalCodeLine?.split(":").slice(1).join(":").trim() || product.sku;
  const productDocumentUrl = documentLine?.split(":").slice(1).join(":").trim();
  const displayedProductDetails = importedDetailLines
    .filter((line) => line !== originalCodeLine && line !== documentLine)
    .join("\n");
  const details = { product: product.name, sku: displaySku };
  const productUrl = absoluteUrl(
    data.setting,
    `/product/${product.slug}.html`,
  );
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: displaySku,
    description: product.description || product.summary,
    image: product.imageUrl
      ? [absoluteUrl(data.setting, product.imageUrl)]
      : undefined,
    category: data.category?.name,
    brand: {
      "@type": "Brand",
      name: data.setting.site_name || "Hygiene Links",
    },
    url: productUrl,
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
      ...(data.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: data.category.name,
              item: absoluteUrl(
                data.setting,
                categoryUrl(data.category.slug),
              ),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: data.category ? 4 : 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <SiteHeader settings={data.setting} />
      <main className="product-page">
        <section className="product-detail">
          <div className="shell product-page-layout">
            <CategorySidebar
              categories={data.categories}
              activeCategorySlug={data.category?.slug}
            />
            <div className="product-detail__content">
              <div className="breadcrumbs">
              <a href="/">Home</a>
              <span>/</span>
              <a href="/catalog.html">Products</a>
              {data.parentCategory && (
                <>
                  <span>/</span>
                  <a href={categoryUrl(data.parentCategory.slug)}>
                    {data.parentCategory.name}
                  </a>
                </>
              )}
              {data.category && (
                <>
                  <span>/</span>
                  <a href={categoryUrl(data.category.slug)}>
                    {data.category.name}
                  </a>
                </>
              )}
              <span>/</span>
              <span>{product.name}</span>
            </div>

              <div className="product-detail__grid">
              <div className="product-gallery">
                <div className="product-gallery__main">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      width="680"
                      height="680"
                    />
                  ) : (
                    <span className="product-placeholder product-placeholder--large">
                      {product.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="product-gallery__badges">
                    {product.featured && <span className="badge">Popular</span>}
                    {product.eco && (
                      <span className="badge badge--green">Eco range</span>
                    )}
                  </div>
                </div>
                <div className="product-gallery__note">
                  <span>PRODUCT IMAGE</span>
                  <p>Pack design or color may vary by market and configuration.</p>
                </div>
              </div>

              <div className="product-info">
                <p className="eyebrow">
                  {data.category?.name ?? "PROFESSIONAL PRODUCT"}
                </p>
                <h1>{product.name}</h1>
                <p className="product-info__summary">{product.summary}</p>
                <div className="product-info__sku">
                  <span>SKU</span>
                  <strong>{displaySku}</strong>
                  <span className="availability-dot" />
                  <b>Enquire for availability</b>
                </div>
                {!editorial?.blocks.length && (
                  <p className="product-info__description">{product.description}</p>
                )}
                <div className="spec-grid">
                  <div>
                    <span>Pack size</span>
                    <strong>{product.packSize || "On request"}</strong>
                  </div>
                  <div>
                    <span>Product details</span>
                    <strong className="spec-grid__multiline">
                      {displayedProductDetails || "Professional use"}
                    </strong>
                  </div>
                  <div>
                    <span>Markets</span>
                    <strong>{data.setting.markets}</strong>
                  </div>
                  <div>
                    <span>Pricing</span>
                    <strong>Bulk quote on request</strong>
                  </div>
                </div>
                <div className="product-info__actions">
                  <a
                    className="button button--whatsapp button--large"
                    href={whatsappLink(whatsapp, details)}
                  >
                    <WhatsAppIcon />
                    WhatsApp enquiry
                  </a>
                  <EnquireNowButton
                    productId={product.id}
                    productName={product.name}
                    sku={displaySku}
                    source="product-page"
                    className="button button--outline button--large"
                  />
                  <AddToEnquiryCartButton
                    variant="detail"
                    product={{
                      id: product.id,
                      name: product.name,
                      sku: displaySku,
                      slug: product.slug,
                      imageUrl: product.imageUrl ?? "",
                    }}
                  />
                </div>
                <div className="product-support">
                  <span>
                    {productDocumentUrl
                      ? "Original product document available"
                      : "Need technical or safety documents?"}
                  </span>
                  {productDocumentUrl ? (
                    <a href={productDocumentUrl} target="_blank" rel="noreferrer">
                      Download product PDF ↗
                    </a>
                  ) : (
                    <a href={`mailto:${email}`}>Ask for SDS / TDS ↗</a>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        {editorial && editorial.blocks.length > 0 && (
          <CatalogEditorial page={editorial} pageTitle={product.name} />
        )}

        <section className="section product-enquiry">
          <div className="shell product-enquiry__grid">
            <div>
              <p className="eyebrow">REQUEST A PRODUCT QUOTE</p>
              <h2>Tell us the pack size and quantity you need.</h2>
              <p>
                Your message will be linked to {product.name} in the CMS, so the
                sales team has the right context from the start.
              </p>
              <ul className="check-list">
                <li>Bulk and distributor quantities</li>
                <li>Market-specific availability</li>
                <li>Private-label options where available</li>
                <li>Technical documentation on request</li>
              </ul>
            </div>
            <div className="enquiry-section__form">
              <div className="form-heading">
                <span>PRODUCT: {product.sku}</span>
                <strong>{product.name}</strong>
              </div>
              <ContactForm
                productId={product.id}
                productName={product.name}
                sku={displaySku}
              />
            </div>
          </div>
        </section>

        {data.relatedProducts.length > 0 && (
          <section className="section section--mist">
            <div className="shell">
              <div className="section-heading section-heading--split">
                <div>
                  <p className="eyebrow">COMPLETE YOUR SUPPLY LIST</p>
                  <h2>Related products</h2>
                </div>
                <a className="text-link" href="/catalog.html">
                  View all products ↗
                </a>
              </div>
              <div className="product-grid">
                {data.relatedProducts.map((related) => (
                  <ProductCard
                    key={related.id}
                    product={related}
                    categoryName={data.category?.name}
                    whatsapp={whatsapp}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter settings={data.setting} />
    </>
  );
}
