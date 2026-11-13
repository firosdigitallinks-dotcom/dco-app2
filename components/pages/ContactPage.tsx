import type { Metadata } from "next";
import { ContactForm } from "../ContactForm";
import { OfficeTabs, type OfficeLocation } from "../OfficeTabs";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { WhatsAppIcon } from "../WhatsAppIcon";
import { getSiteData } from "../../db/site";
import { whatsappLink } from "../../lib/links";
import { buildPageMetadata } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo["page:contact"],
    fallbackTitle: "Contact Diamond Capital Oasis for Product Enquiries",
    fallbackDescription:
      "Contact Diamond Capital Oasis in the UAE, Oman or Qatar for product availability, bulk pricing, technical documents and customized supply.",
    canonicalPath: "/contact.html",
  });
}

const officeDefinitions = [
  { key: "abu_dhabi", country: "uae" },
  { key: "dubai", country: "uae" },
  { key: "umm_al_quwain", country: "uae" },
  { key: "doha", country: "qatar" },
  { key: "barka", country: "oman" },
] as const;

function mapUrls(value: string) {
  const query = value.trim();
  try {
    const url = new URL(query);
    if (
      url.protocol === "https:" &&
      ["google.com", "www.google.com", "maps.google.com"].includes(url.hostname)
    ) {
      return {
        embed: query,
        open: query.replace("/maps/embed", "/maps"),
      };
    }
  } catch {
    // Plain locations are converted into safe Google Maps URLs below.
  }
  const encoded = encodeURIComponent(query || "Diamond Capital Oasis");
  return {
    embed: `https://www.google.com/maps?q=${encoded}&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}

export default async function ContactPage() {
  const data = await getSiteData();
  const { content, setting } = data;
  const email = setting.email ?? "info@diamondcapitaloasis.com";
  const whatsapp = setting.whatsapp ?? "971505689879";
  const offices: OfficeLocation[] = officeDefinitions.map(({ key, country }) => {
    const map = mapUrls(content[`office_${key}_map`] || key.replaceAll("_", " "));
    return {
      key,
      country,
      market: content[`office_${key}_market`],
      title: content[`office_${key}_city`],
      company: content[`office_${key}_company`],
      address: content[`office_${key}_address`],
      phone: content[`office_${key}_phone`],
      fax: content[`office_${key}_fax`],
      email: content[`office_${key}_email`],
      mapEmbed: map.embed,
      mapOpen: map.open,
    };
  });

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <section className="contact-hero">
          <div className="shell">
            <div className="breadcrumbs">
              <a href="/">Home</a>
              <span>/</span>
              <span>Contact</span>
            </div>
            <div className="contact-hero__grid">
              <div>
                <p className="eyebrow">CONTACT DIAMOND CAPITAL OASIS</p>
                <h1>{content.contact_title}</h1>
                <p>{content.contact_body}</p>
              </div>
              <div className="contact-hero__channels">
                <a href={whatsappLink(whatsapp)}>
                  <WhatsAppIcon />
                  <div>
                    <small>FASTEST RESPONSE</small>
                    <strong>Chat on WhatsApp</strong>
                  </div>
                  <b>↗</b>
                </a>
                <a href={`mailto:${email}`}>
                  <span className="mail-mark">@</span>
                  <div>
                    <small>SEND A PRODUCT LIST</small>
                    <strong>{email}</strong>
                  </div>
                  <b>↗</b>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section contact-main">
          <div className="shell contact-main__grid">
            <div className="contact-form-card">
              <div className="form-heading">
                <span>PRODUCT & SUPPLY ENQUIRY</span>
                <strong>Tell us about your requirements.</strong>
                <p>
                  Your enquiry is emailed to our team, saved for follow-up and
                  confirmed to your inbox after submission.
                </p>
              </div>
              <ContactForm />
            </div>
            <aside className="contact-sidebar">
              <p className="eyebrow">WHAT TO INCLUDE</p>
              <h2>Help us quote accurately.</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Products or application</strong>
                    <p>Share names, SKUs or the areas you need to clean.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Pack size and quantity</strong>
                    <p>Tell us whether this is a trial, site supply or bulk order.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Delivery market</strong>
                    <p>UAE, Oman or Qatar, plus your city or project location.</p>
                  </div>
                </li>
              </ol>
              <div className="response-note">
                <span />
                <p>
                  <strong>Regional sales support</strong>
                  Our team will route your request to the appropriate market.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="section section--mist offices-section">
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">REGIONAL OFFICES</p>
                <h2>Local teams across the Gulf.</h2>
              </div>
              <p>
                Contact the location nearest to your project, or use the main
                enquiry form and we’ll route it for you.
              </p>
            </div>
            <OfficeTabs offices={offices} />
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
