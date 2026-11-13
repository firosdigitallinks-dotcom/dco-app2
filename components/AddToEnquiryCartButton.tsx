"use client";

import { useEffect, useRef, useState } from "react";
import {
  ENQUIRY_CART_ADD_EVENT,
  type EnquiryCartProduct,
} from "../lib/enquiry-cart";

export function AddToEnquiryCartButton({
  product,
  variant = "card",
}: {
  product: EnquiryCartProduct;
  variant?: "card" | "detail";
}) {
  const [added, setAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function addProduct() {
    window.dispatchEvent(
      new CustomEvent<EnquiryCartProduct>(ENQUIRY_CART_ADD_EVENT, {
        detail: product,
      }),
    );
    setAdded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      className={`button cart-add-button cart-add-button--${variant}${
        variant === "detail" ? " button--large" : " button--small"
      }`}
      type="button"
      onClick={addProduct}
      aria-label={`Add ${product.name} to bulk enquiry`}
    >
      <span aria-hidden="true">{added ? "✓" : "+"}</span>
      {added ? "Added to enquiry" : "Add to bulk enquiry"}
    </button>
  );
}
