"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ENQUIRY_SUBMITTED_EVENT,
  type EnquirySource,
} from "../lib/enquiry-events";

export function ContactForm({
  productId,
  productName,
  sku,
  initialMessage = "",
  source,
  submitLabel = "Send enquiry",
}: {
  productId?: string;
  productName?: string;
  sku?: string;
  initialMessage?: string;
  source?: EnquirySource;
  submitLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus("idle");
    setError("");
  }, [productId, productName, initialMessage]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          productId,
          productName,
          sku,
          pageUrl: window.location.href,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We could not send your enquiry.");
        setStatus("error");
        return;
      }
      const customerEmail = String(formData.get("email") ?? "");
      form.reset();
      setStatus("idle");
      window.dispatchEvent(
        new CustomEvent(ENQUIRY_SUBMITTED_EVENT, {
          detail: { email: customerEmail, productName, source },
        }),
      );
      window.dispatchEvent(new Event("hygiene-links:enquiry"));
    } catch {
      setError("We could not connect to the enquiry service. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form className="enquiry-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          <span>Name *</span>
          <input name="name" required placeholder="Your name" />
        </label>
        <label>
          <span>Company</span>
          <input name="company" placeholder="Company name" />
        </label>
        <label>
          <span>Email *</span>
          <input name="email" type="email" required placeholder="name@company.com" />
        </label>
        <label>
          <span>Phone / WhatsApp</span>
          <input name="phone" type="tel" placeholder="+971" />
        </label>
        <label>
          <span>Market</span>
          <select name="market" defaultValue="UAE">
            <option>UAE</option>
            <option>Oman</option>
            <option>Qatar</option>
          </select>
        </label>
        <label className="honeypot" aria-hidden="true">
          <span>Website</span>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="form-grid__wide">
          <span>What do you need? *</span>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            defaultValue={initialMessage}
            placeholder={
              productName
                ? `Quantity, pack size and delivery location for ${productName}`
                : "Products, quantities, application and delivery location"
            }
          />
        </label>
      </div>
      {status === "error" && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button button--primary button--wide"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending enquiry…" : submitLabel}
      </button>
      <p className="form-note">
        Your enquiry is emailed to our team and securely saved for follow-up.
      </p>
    </form>
  );
}
