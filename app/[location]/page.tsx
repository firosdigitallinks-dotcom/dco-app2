import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "../../components/ContactForm";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import {
  getAllLocationSlugs,
  getLocationBySlug,
  locationPages,
} from "../../data/locations";
import { getSiteData } from "../../db/site";
import { withBasePath } from "../../lib/base-path";
import { whatsappLink } from "../../lib/links";
import { buildPageMetadata } from "../../lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLocationSlugs().map((slug) => ({
    location: slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) return {};

  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    fallbackTitle: `${loc.h1} | Diamond Capital Oasis`,
    fallbackDescription: loc.metaDescription,
    canonicalPath: `/${loc.slug}/`,
  });
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) notFound();

  const data = await getSiteData();
  const { setting } = data;
  const whatsapp = setting.whatsapp ?? "971505689879";

  return (
    <>
      <SiteHeader settings={setting} />
      <main className="dco-location-page">
        {/* Part 1: H1 and one-line subhead */}
        <section className="location-hero">
          <div className="shell">
            <div className="breadcrumbs">
              <a href={withBasePath("/")}>Home</a>
              <span>/</span>
              <span>Locations</span>
              <span>/</span>
              <span>{loc.name}</span>
            </div>
            <h1>{loc.h1}</h1>
            <p className="location-hero__subhead">{loc.subhead}</p>
            <div className="location-hero__actions">
              <a
                className="button button--primary button--large"
                href="#quote"
              >
                Request a Quote <span>↓</span>
              </a>
              <a
                className="button button--whatsapp button--large"
                href={whatsappLink(whatsapp, { product: loc.h1 })}
              >
                <WhatsAppIcon />
                Enquire on WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Part 2: Short intro */}
        <section className="location-content-section">
          <div className="shell">
            <div className="location-intro-box">
              <h2>{loc.sectionTitle}</h2>
              <p>{loc.intro}</p>
            </div>
          </div>
        </section>

        {/* Part 3: Who we supply here */}
        <section className="location-content-section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="section-heading" style={{ marginBottom: 20 }}>
              <h2>{`Who We Supply in ${loc.name}`}</h2>
            </div>
            <div className="location-supply-grid">
              {loc.whoWeSupply.map((item, idx) => (
                <div key={idx} className="location-supply-card">
                  <span className="location-supply-card__icon" aria-hidden="true">✓</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Part 4: One question and answer */}
        <section className="location-content-section section--mist">
          <div className="shell">
            <div className="section-heading" style={{ marginBottom: 20 }}>
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className="location-faq-box">
              <h3>{loc.faqQuestion}</h3>
              <p>{loc.faqAnswer}</p>
            </div>
          </div>
        </section>

        {/* Part 5: Link to products */}
        <section className="location-content-section">
          <div className="shell">
            <div className="location-products-card">
              <h2>Explore Our Products</h2>
              <p>{loc.exploreText}</p>
              <a
                className="button button--primary button--large"
                href={withBasePath("/catalog.html")}
              >
                See all our products <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Part 6: Nearby locations and quote form */}
        <section className="location-content-section section--mist" id="quote">
          <div className="shell">
            <div className="location-nearby-wrapper">
              <h2>Nearby Locations</h2>
              <div className="location-nearby-links">
                {loc.nearby.map((near) => (
                  <a
                    key={near.slug}
                    className="location-nearby-chip"
                    href={withBasePath(`/${near.slug}/`)}
                  >
                    📍 {near.name} <span>→</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="location-quote-box">
              <div className="form-heading">
                <span>Enquiry Form</span>
                <h2>Request a Quote</h2>
              </div>
              <ContactForm
                defaultLocation={loc.name}
                defaultMarket="Oman"
                submitLabel="Submit"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
