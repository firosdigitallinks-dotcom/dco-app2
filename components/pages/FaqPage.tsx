import type { Metadata } from "next";
import { CompanyPageNav } from "../CompanyPageNav";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { WhatsAppIcon } from "../WhatsAppIcon";
import { getSiteData } from "../../db/site";
import { whatsappLink } from "../../lib/links";
import { absoluteUrl, buildPageMetadata, jsonLd } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo["page:faq"],
    fallbackTitle: "Frequently Asked Questions (FAQs) | Diamond Capital Oasis",
    fallbackDescription:
      "Find expert answers to common questions about swimming pool chemicals, bulk detergent manufacturing, cleaning supplies, and wholesale hygiene products in the UAE.",
    canonicalPath: "/faq.html",
  });
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tag?: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "pool-chemicals-suppliers",
    category: "Chemicals & Disinfectants",
    question:
      "Which swimming pool chemicals suppliers are reputable and how can I compare prices and quality?",
    answer:
      "When purchasing supplies, it is advisable to look for suppliers who have tested, quality products, clear product identification, reliable supply sources and storage and handling guidelines. When comparing suppliers, it is best to consider quality, concentrations, certifications, prices, delivery times, and after-sales support rather than just price.",
    tag: "Swimming Pool Care",
  },
  {
    id: "detergent-manufacturers-uae-bulk",
    category: "Bulk Detergents & Manufacturing",
    question:
      "Can you recommend a list of reliable detergent manufacturers in the UAE for bulk orders?",
    answer:
      "Reliability, good manufacturing standards, the ability to handle large orders, good quality and safety documentation, etc., would be some of the factors to look out for in cleaning chemicals manufacturers. Hygiene Links supplies a wide range of professional cleaning and detergent products across a range of industries, so would suit organisations looking for reliable supplies of bulk items.",
    tag: "Bulk Manufacturing",
  },
  {
    id: "cleaning-products-online-after-sales",
    category: "Sourcing & After-Sales Support",
    question:
      "Where can I buy reliable cleaning products in the UAE or online with good after-sales support?",
    answer:
      "Cleaning products from reputable hygiene and cleaning supply companies that stock a wide range of products, good delivery services, product information and good customer service are worth considering. This is especially so if considering an online purchase, where product information should be checked, suppliers' reputation verified, delivery area checked and after-sales support looked at.",
    tag: "Procurement & Support",
  },
  {
    id: "cleaning-supplies-home-cotton-mops",
    category: "Cleaning Tools & Equipment",
    question:
      "Can you recommend reliable UAE suppliers for cleaning supplies and home cleaning products?",
    answer:
      "When choosing a UAE cleaning-supply supplier, consider product variety, quality standards, availability, pricing, and delivery capabilities. Hygiene Links offers cleaning chemicals, tools, paper products, waste-management supplies, and other hygiene products for homes and businesses.",
    tag: "Cotton Mop Suppliers",
  },
  {
    id: "compare-bulk-detergent-manufacturers",
    category: "Bulk Detergents & Manufacturing",
    question:
      "How should businesses compare detergent manufacturers in the UAE for bulk orders?",
    answer:
      "For bulk detergent orders, compare manufacturers based on production capacity, product consistency, quality standards, customisation options, pricing, and delivery reliability. Established suppliers such as Hygiene Links can be considered when sourcing detergents and other professional cleaning products in larger quantities.",
    tag: "Commercial Sourcing",
  },
  {
    id: "wholesale-toilet-roll-suppliers-uae",
    category: "Tissue & Washroom Hygiene",
    question:
      "Could you recommend top wholesale toilet roll suppliers with reliable delivery in the UAE?",
    answer:
      "When comparing wholesale toilet roll suppliers, look at paper quality, ply, sheet size, packaging, bulk pricing, stock availability, and delivery coverage. It is also useful to choose suppliers that offer a wider range of tissue and washroom hygiene products, allowing businesses to consolidate their purchases.",
    tag: "Wholesale Tissue",
  },
  {
    id: "eco-friendly-compliant-chemicals",
    category: "Chemicals & Disinfectants",
    question:
      "Which UAE chemical companies offer eco-friendly or compliant products?",
    answer:
      "Several UAE suppliers provide cleaning chemicals designed to meet specific safety, environmental, and regulatory requirements. When selecting eco-friendly or compliant products, check the product's certifications, ingredients, safety data sheets, environmental claims, and intended application rather than relying solely on marketing terms.",
    tag: "Green & Compliance",
  },
  {
    id: "fairy-dishwashing-liquid-tough-grease",
    category: "Kitchen & Warewashing",
    question:
      "What makes Fairy dishwashing liquid effective for tough grease compared to other brands?",
    answer:
      "Fairy dishwashing liquid is formulated to help break down and remove grease and food residue effectively while producing sufficient lather for everyday dishwashing. Its performance can vary depending on the formulation and usage, so factors such as concentration, water temperature, and the type of grease should also be considered when comparing dishwashing products.",
    tag: "Degreasing & Dishwash",
  },
];

export default async function FaqPage() {
  const data = await getSiteData();
  const { setting } = data;
  const whatsappUrl = whatsappLink(setting.whatsapp ?? "971505689879");
  const phone = setting.phone ?? "+971 50 568 9879";
  const email = setting.email ?? "info@hygienelinks.com";

  const categories = Array.from(new Set(FAQ_ITEMS.map((item) => item.category)));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Diamond Capital Oasis FAQs",
    url: absoluteUrl(setting, "/faq.html"),
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
        />

        <section className="company-page-hero company-page-hero--faq">
          <div className="shell company-page-hero__grid">
            <div>
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <a href="/about.html">About Us</a>
                <span>/</span>
                <span>FAQs</span>
              </div>
              <p className="eyebrow">HELP & BUYING GUIDES</p>
              <h1>Frequently Asked Questions</h1>
              <p>
                Get trusted answers on professional cleaning chemicals, bulk
                detergent manufacturing, wholesale washroom supplies, and regional
                delivery across the UAE and Gulf.
              </p>
            </div>
            <div className="company-page-hero__monogram" aria-hidden="true">
              <span>FAQ</span>
              <small>HELP</small>
            </div>
          </div>
        </section>

        <CompanyPageNav active="faq" />

        <section className="section faq-section">
          <div className="shell">
            <div className="faq-intro">
              <div className="faq-intro__header">
                <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
                <h2>Answers to common cleaning and supply questions</h2>
                <p className="faq-intro__lead">
                  Whether you are sourcing bulk detergents for an industrial facility,
                  comparing wholesale toilet paper for washrooms, or selecting
                  pool chemicals, find key guidelines below.
                </p>
              </div>

              <div className="faq-category-pills" aria-label="FAQ categories">
                <span className="faq-category-pills__label">Quick topics:</span>
                {categories.map((category) => (
                  <span key={category} className="faq-category-pill">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="faq-accordion" role="region" aria-label="FAQ List">
              {FAQ_ITEMS.map((faq, index) => (
                <details
                  key={faq.id}
                  className="faq-item"
                  id={faq.id}
                  open={index === 0}
                >
                  <summary className="faq-item__question">
                    <div className="faq-item__header">
                      {faq.tag && (
                        <span className="faq-item__tag">{faq.tag}</span>
                      )}
                      <h3 className="faq-item__title">{faq.question}</h3>
                    </div>
                    <span className="faq-item__toggle" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" className="vertical-line" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </summary>
                  <div className="faq-item__answer">
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>

            <aside className="faq-cta-banner">
              <div className="faq-cta-banner__content">
                <p className="eyebrow">NEED SPECIALIST ADVICE?</p>
                <h2>Have questions about specific chemicals or bulk supply?</h2>
                <p>
                  Our technical and sales teams in Dubai, Abu Dhabi, Oman and Qatar
                  provide custom formulation support, Material Safety Data Sheets
                  (MSDS), product testing and bulk commercial pricing.
                </p>
                <div className="faq-cta-banner__actions">
                  <a className="button button--primary button--large" href="/contact.html">
                    Contact our team ↗
                  </a>
                  <a
                    className="button button--secondary button--large"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon />
                    WhatsApp consultation
                  </a>
                </div>
              </div>
              <div className="faq-cta-banner__contacts">
                <div className="faq-contact-box">
                  <span className="faq-contact-box__icon">☎</span>
                  <div>
                    <small>Direct phone</small>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>
                      <strong>{phone}</strong>
                    </a>
                  </div>
                </div>
                <div className="faq-contact-box">
                  <span className="faq-contact-box__icon">✉</span>
                  <div>
                    <small>Email enquiry</small>
                    <a href={`mailto:${email}`}>
                      <strong>{email}</strong>
                    </a>
                  </div>
                </div>
                <div className="faq-contact-box">
                  <span className="faq-contact-box__icon">📦</span>
                  <div>
                    <small>Product Catalog</small>
                    <a href="/catalog.html">
                      <strong>Browse 500+ items ↗</strong>
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
