export const ENQUIRY_CART_STORAGE_KEY = "hygiene-links:bulk-enquiry-cart";
export const ENQUIRY_CART_ADD_EVENT = "hygiene-links:add-to-enquiry-cart";

export type EnquiryCartItem = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  imageUrl: string;
  quantity: number;
};

export type EnquiryCartProduct = Omit<EnquiryCartItem, "quantity">;
