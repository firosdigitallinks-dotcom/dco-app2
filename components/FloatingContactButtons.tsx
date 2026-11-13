"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "../lib/links";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function FloatingContactButtons({
  phone,
  whatsapp,
}: {
  phone: string;
  whatsapp: string;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const phoneHref = phone.replace(/[^+\d]/g, "");

  return (
    <nav className="floating-contact" aria-label="Quick contact">
      <a
        className="floating-contact__button floating-contact__button--whatsapp"
        href={whatsappLink(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Enquire on WhatsApp"
      >
        <span className="floating-contact__icon">
          <WhatsAppIcon compact />
        </span>
        <span>WhatsApp</span>
      </a>
      <a
        className="floating-contact__button floating-contact__button--call"
        href={`tel:${phoneHref}`}
        aria-label={`Call Diamond Capital Oasis on ${phone}`}
      >
        <span className="floating-contact__icon" aria-hidden="true">
          ☎
        </span>
        <span>Call now</span>
      </a>
    </nav>
  );
}
