"use client";

import { useEffect, useRef, useState } from "react";
import {
  ENQUIRY_SUBMITTED_EVENT,
  OPEN_ENQUIRY_DIALOG_EVENT,
  type EnquirySubmittedDetail,
  type OpenEnquiryDetail,
} from "../lib/enquiry-events";
import { ContactForm } from "./ContactForm";

type DialogState =
  | { mode: "closed" }
  | { mode: "form"; detail: OpenEnquiryDetail }
  | { mode: "thanks"; detail: EnquirySubmittedDetail };

export function EnquiryDialog() {
  const [state, setState] = useState<DialogState>({ mode: "closed" });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<OpenEnquiryDetail>).detail;
      if (!detail?.source) return;
      setState({ mode: "form", detail });
    }
    function onSubmitted(event: Event) {
      const detail = (event as CustomEvent<EnquirySubmittedDetail>).detail;
      setState({ mode: "thanks", detail });
    }
    window.addEventListener(OPEN_ENQUIRY_DIALOG_EVENT, onOpen);
    window.addEventListener(ENQUIRY_SUBMITTED_EVENT, onSubmitted);
    return () => {
      window.removeEventListener(OPEN_ENQUIRY_DIALOG_EVENT, onOpen);
      window.removeEventListener(ENQUIRY_SUBMITTED_EVENT, onSubmitted);
    };
  }, []);

  useEffect(() => {
    if (state.mode === "closed") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setState({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state.mode]);

  if (state.mode === "closed") return null;

  const close = () => setState({ mode: "closed" });
  const productName =
    state.mode === "form" ? state.detail.productName : state.detail.productName;

  return (
    <div className="enquiry-dialog-layer">
      <button
        className="enquiry-dialog-overlay"
        type="button"
        onClick={close}
        aria-label="Close enquiry form"
      />
      <section
        className="enquiry-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-dialog-title"
      >
        <button
          ref={closeButtonRef}
          className="enquiry-dialog__close"
          type="button"
          onClick={close}
          aria-label="Close enquiry form"
        >
          ×
        </button>

        {state.mode === "form" ? (
          <>
            <div className="enquiry-dialog__heading">
              <span>REQUEST A QUOTE</span>
              <h2 id="enquiry-dialog-title">
                {productName ? `Enquire about ${productName}` : "Tell us what you need"}
              </h2>
              <p>
                Complete the form and our team will reply by email. A confirmation
                will also be sent to your inbox.
              </p>
            </div>
            <ContactForm
              productId={state.detail.productId}
              productName={state.detail.productName}
              sku={state.detail.sku}
              initialMessage={state.detail.initialMessage}
              source={state.detail.source}
              submitLabel={
                state.detail.source === "bulk-cart"
                  ? "Send bulk enquiry"
                  : "Send enquiry"
              }
            />
          </>
        ) : (
          <div className="enquiry-dialog__thanks" role="status">
            <span className="enquiry-dialog__check" aria-hidden="true">✓</span>
            <p className="eyebrow">ENQUIRY RECEIVED</p>
            <h2 id="enquiry-dialog-title">Thank you for contacting us.</h2>
            <p>
              Your enquiry{productName ? ` about ${productName}` : ""} has been
              sent to our sales team. We also sent a confirmation to
              <strong> {state.detail.email}</strong>.
            </p>
            <button className="button button--primary" type="button" onClick={close}>
              Continue browsing
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
