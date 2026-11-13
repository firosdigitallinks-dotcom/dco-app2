"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function AnalyticsEvents({
  googleAdsId,
  conversionLabel,
}: {
  googleAdsId?: string;
  conversionLabel?: string;
}) {
  useEffect(() => {
    function trackLead(channel: string) {
      window.dataLayer?.push({
        event: "generate_lead",
        enquiry_channel: channel,
      });
      window.gtag?.("event", "generate_lead", {
        enquiry_channel: channel,
      });
      if (googleAdsId && conversionLabel) {
        window.gtag?.("event", "conversion", {
          send_to: `${googleAdsId}/${conversionLabel}`,
        });
      }
      window.fbq?.("track", "Lead", { channel });
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("mailto:")) trackLead("email");
      if (href.includes("wa.me/") || href.includes("whatsapp.com/")) {
        trackLead("whatsapp");
      }
    }

    function onEnquiry() {
      trackLead("website_form");
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("hygiene-links:enquiry", onEnquiry);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hygiene-links:enquiry", onEnquiry);
    };
  }, [conversionLabel, googleAdsId]);

  return null;
}

