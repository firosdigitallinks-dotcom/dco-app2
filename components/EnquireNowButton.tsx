"use client";

import { openEnquiryDialog, type EnquirySource } from "../lib/enquiry-events";

export function EnquireNowButton({
  productId,
  productName,
  sku,
  source,
  className = "button button--outline button--small",
}: {
  productId?: string;
  productName?: string;
  sku?: string;
  source: EnquirySource;
  className?: string;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={() =>
        openEnquiryDialog({ productId, productName, sku, source })
      }
      aria-label={
        productName ? `Enquire now about ${productName}` : "Open enquiry form"
      }
    >
      Enquire Now
    </button>
  );
}
