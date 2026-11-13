export const OPEN_ENQUIRY_DIALOG_EVENT = "hygiene-links:open-enquiry";
export const ENQUIRY_SUBMITTED_EVENT = "hygiene-links:enquiry-submitted";

export type EnquirySource = "product-card" | "product-page" | "bulk-cart";

export type OpenEnquiryDetail = {
  productId?: string;
  productName?: string;
  sku?: string;
  initialMessage?: string;
  source: EnquirySource;
};

export type EnquirySubmittedDetail = {
  email: string;
  productName?: string;
  source?: EnquirySource;
};

export function openEnquiryDialog(detail: OpenEnquiryDetail) {
  window.dispatchEvent(
    new CustomEvent<OpenEnquiryDetail>(OPEN_ENQUIRY_DIALOG_EVENT, { detail }),
  );
}
