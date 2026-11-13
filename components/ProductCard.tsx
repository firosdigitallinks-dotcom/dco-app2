import type { Product } from "../db/site";
import { whatsappLink } from "../lib/links";
import { AddToEnquiryCartButton } from "./AddToEnquiryCartButton";
import { EnquireNowButton } from "./EnquireNowButton";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function ProductCard({
  product,
  categoryName,
  whatsapp,
}: {
  product: Product;
  categoryName?: string;
  whatsapp: string;
}) {
  const details = { product: product.name, sku: product.sku };
  return (
    <article className="product-card">
      <a
        className="product-card__image"
        href={`/product/${product.slug}.html`}
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            width="380"
            height="380"
            loading="lazy"
          />
        ) : (
          <span className="product-placeholder" aria-hidden="true">
            {product.name
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </span>
        )}
        <div className="product-card__badges">
          {product.eco && <span className="badge badge--green">Eco range</span>}
          {product.featured && <span className="badge">Popular</span>}
        </div>
      </a>
      <div className="product-card__body">
        <p className="product-card__category">{categoryName ?? "Professional range"}</p>
        <h3>
          <a href={`/product/${product.slug}.html`}>{product.name}</a>
        </h3>
        <p className="product-card__summary">{product.summary}</p>
        <div className="product-card__meta">
          <span>SKU {product.sku}</span>
          <span>{product.packSize || "Pack sizes on request"}</span>
        </div>
      </div>
      <div className="product-card__actions">
        <EnquireNowButton
          productId={product.id}
          productName={product.name}
          sku={product.sku}
          source="product-card"
        />
        <a
          className="icon-button icon-button--whatsapp"
          href={whatsappLink(whatsapp, details)}
          aria-label={`WhatsApp an enquiry about ${product.name}`}
        >
          <WhatsAppIcon compact />
        </a>
        <AddToEnquiryCartButton
          product={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            imageUrl: product.imageUrl ?? "",
          }}
        />
      </div>
    </article>
  );
}
