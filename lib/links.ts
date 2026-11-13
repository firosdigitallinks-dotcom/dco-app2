export function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappLink(
  whatsapp: string,
  options?: { product?: string; sku?: string; pageUrl?: string },
) {
  const parts = [
    "Hello Hygiene Links,",
    options?.product
      ? `I would like a quote for ${options.product}${options.sku ? ` (${options.sku})` : ""}.`
      : "I would like help with a product enquiry.",
    options?.pageUrl ? `Product page: ${options.pageUrl}` : "",
    "Please share availability, pack sizes and bulk pricing.",
  ].filter(Boolean);
  return `https://wa.me/${normalizeWhatsapp(whatsapp)}?text=${encodeURIComponent(
    parts.join("\n"),
  )}`;
}

export function emailLink(
  email: string,
  options?: { product?: string; sku?: string; pageUrl?: string },
) {
  const subject = options?.product
    ? `Product enquiry: ${options.product}`
    : "Product enquiry from hygienelinks.com";
  const body = [
    "Hello Hygiene Links,",
    "",
    options?.product
      ? `Please provide a quote for ${options.product}${options.sku ? ` (${options.sku})` : ""}.`
      : "I would like help selecting products for my facility.",
    options?.pageUrl ? `Product page: ${options.pageUrl}` : "",
    "",
    "Company:",
    "Required quantity:",
    "Delivery location:",
  ]
    .filter((line) => line !== "")
    .join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
