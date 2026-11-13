"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ENQUIRY_CART_ADD_EVENT,
  ENQUIRY_CART_STORAGE_KEY,
  type EnquiryCartItem,
  type EnquiryCartProduct,
} from "../lib/enquiry-cart";
import {
  ENQUIRY_SUBMITTED_EVENT,
  openEnquiryDialog,
  type EnquirySubmittedDetail,
} from "../lib/enquiry-events";
import { normalizeWhatsapp } from "../lib/links";
import { WhatsAppIcon } from "./WhatsAppIcon";

function storedItems(): EnquiryCartItem[] {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ENQUIRY_CART_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is EnquiryCartItem =>
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.sku === "string" &&
        typeof item?.slug === "string" &&
        typeof item?.imageUrl === "string" &&
        Number.isInteger(item?.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function EnquiryCart({
  whatsapp,
}: {
  whatsapp: string;
}) {
  const [items, setItems] = useState<EnquiryCartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    setItems(storedItems());
    setReady(true);
    setActive(true);
  }, []);

  useEffect(() => {
    function onSubmitted(event: Event) {
      const detail = (event as CustomEvent<EnquirySubmittedDetail>).detail;
      if (detail?.source === "bulk-cart") setItems([]);
    }
    window.addEventListener(ENQUIRY_SUBMITTED_EVENT, onSubmitted);
    return () => window.removeEventListener(ENQUIRY_SUBMITTED_EVENT, onSubmitted);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(ENQUIRY_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    function onAdd(event: Event) {
      const product = (event as CustomEvent<EnquiryCartProduct>).detail;
      if (!product?.id) return;
      setItems((current) => {
        const existing = current.find((item) => item.id === product.id);
        if (existing) {
          return current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [...current, { ...product, quantity: 1 }];
      });
    }
    window.addEventListener(ENQUIRY_CART_ADD_EVENT, onAdd);
    return () => window.removeEventListener(ENQUIRY_CART_ADD_EVENT, onAdd);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const enquiryText = useMemo(() => {
    const origin = typeof window === "undefined" ? "https://hygienelinks.com" : window.location.origin;
    return [
      "Hello Diamond Capital Oasis,",
      "",
      "I would like a bulk quote for the following products:",
      "",
      ...items.flatMap((item, index) => [
        `${index + 1}. ${item.name} (${item.sku})`,
        `Quantity: ${item.quantity}`,
        `Product page: ${origin}/product/${item.slug}.html`,
        "",
      ]),
      "Company:",
      "Delivery location:",
      "Please share availability, pack sizes and bulk pricing.",
    ].join("\n");
  }, [items]);
  const whatsappHref = `https://wa.me/${normalizeWhatsapp(
    whatsapp,
  )}?text=${encodeURIComponent(enquiryText)}`;

  function setQuantity(id: string, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(9999, Math.round(quantity) || 1));
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: nextQuantity } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function openBulkEnquiryForm() {
    setOpen(false);
    openEnquiryDialog({
      productName: "Bulk product enquiry",
      initialMessage: enquiryText,
      source: "bulk-cart",
    });
  }

  if (!active) return null;

  return (
    <>
      <button
        className="enquiry-cart-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open bulk enquiry cart with ${totalQuantity} items`}
      >
        <span className="enquiry-cart-trigger__icon" aria-hidden="true">+</span>
        <span>
          <small>Bulk enquiry</small>
          <strong>{totalQuantity ? `${totalQuantity} selected` : "Build your list"}</strong>
        </span>
        <b>{totalQuantity}</b>
      </button>

      {open && (
        <div className="enquiry-cart-layer">
          <button
            className="enquiry-cart-overlay"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close bulk enquiry cart"
          />
          <aside
            className="enquiry-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-cart-title"
          >
            <header className="enquiry-cart__header">
              <div>
                <span>PRODUCT SELECTION</span>
                <h2 id="enquiry-cart-title">Bulk enquiry cart</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close cart">
                ×
              </button>
            </header>

            {items.length ? (
              <>
                <div className="enquiry-cart__list">
                  {items.map((item) => (
                    <article className="enquiry-cart-item" key={item.id}>
                      <a href={`/product/${item.slug}.html`}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name || "Enquiry product"}
                            width="72"
                            height="72"
                          />
                        ) : (
                          <span>{item.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </a>
                      <div className="enquiry-cart-item__details">
                        <a href={`/product/${item.slug}.html`}>{item.name}</a>
                        <small>SKU {item.sku}</small>
                        <label>
                          <span>Quantity</span>
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={item.quantity}
                            onChange={(event) =>
                              setQuantity(item.id, Number(event.target.value))
                            }
                          />
                        </label>
                      </div>
                      <button
                        className="enquiry-cart-item__remove"
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
                <footer className="enquiry-cart__footer">
                  <div className="enquiry-cart__summary">
                    <span>{items.length} products</span>
                    <strong>{totalQuantity} total quantity</strong>
                    <button type="button" onClick={() => setItems([])}>Clear all</button>
                  </div>
                  <a className="button button--whatsapp" href={whatsappHref}>
                    <WhatsAppIcon />
                    Enquire through WhatsApp
                  </a>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={openBulkEnquiryForm}
                  >
                    Complete enquiry form
                  </button>
                  <p>Your selected products and quantities are added automatically.</p>
                </footer>
              </>
            ) : (
              <div className="enquiry-cart__empty">
                <span>+</span>
                <h3>Your bulk enquiry list is empty.</h3>
                <p>Add any products you need, then send the complete list by email or WhatsApp.</p>
                <a className="button button--primary" href="/catalog.html">
                  Browse products
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
