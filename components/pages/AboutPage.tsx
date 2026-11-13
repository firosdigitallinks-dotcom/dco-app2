import type { Metadata } from "next";
import { CompanyPageNav } from "../CompanyPageNav";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { getSiteData } from "../../db/site";
import { categoryUrl } from "../../lib/category-url";
import { buildPageMetadata } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo["page:about"],
    fallbackTitle: "About Diamond Capital Oasis",
    fallbackDescription:
      "Learn about Hygiene Links, a multidivisional manufacturer, importer and exporter serving professional hygiene needs across the Gulf.",
    canonicalPath: "/about.html",
  });
}

const milestones = [
  {
    year: "2006",
    title: "The journey begins",
    body: "Hygiene Links launches with a focus on dependable cleaning and hygiene supply.",
  },
  {
    year: "MANUFACTURE",
    title: "Capability grows",
    body: "Production expands across detergents, disinfectants, plastic and paper products.",
  },
  {
    year: "REGIONAL",
    title: "A Gulf network",
    body: "Teams and partners support customers across the UAE, Oman and Qatar.",
  },
  {
    year: "TODAY",
    title: "One connected catalog",
    body: "A broad professional range combines in-house manufacturing with specialist sourcing.",
  },
];

export default async function AboutPage() {
  const data = await getSiteData();
  const { content, setting } = data;

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <section className="about-hero">
          <div className="shell about-hero__grid">
            <div>
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <span>About</span>
              </div>
              <p className="eyebrow">OUR COMPANY</p>
              <h1>{content.about_title}</h1>
              <p>{content.about_body}</p>
            </div>
            <div className="about-hero__mark">
              <img
                src="/brand/dco-mark.png"
                alt="Diamond Capital Oasis"
                width="260"
                height="260"
              />
              <div>
                <span>Since</span>
                <strong>2006</strong>
                <small>UAE · OMAN · QATAR</small>
              </div>
            </div>
          </div>
        </section>

        <section className="about-facts">
          <div className="shell">
            <div>
              <strong>{setting.catalog_claim ?? "500+"}</strong>
              <span>products and solutions</span>
            </div>
            <div>
              <strong>4</strong>
              <span>manufacturing divisions</span>
            </div>
            <div>
              <strong>3</strong>
              <span>regional markets</span>
            </div>
            <div>
              <strong>1</strong>
              <span>one-stop supply partner</span>
            </div>
          </div>
        </section>

        <CompanyPageNav active="about" />

        <section className="section company-profile">
          <div className="shell">
            <div className="company-profile__intro">
              <div>
                <p className="eyebrow">WHO WE ARE</p>
                <h2>A multi-divisional group built around everyday hygiene.</h2>
              </div>
              <p>
                {content.about_profile_intro ||
                  "Hygiene Links is an exciting, fast-growing group with the aim to be a conglomerate indulging in the manufacturing of plastic Bags, detergents and disinfectants, paper products, imports and exports of cleaning products, PPE, aerosols, washroom products etc. Our group has a family-friendly atmosphere, with a strong dedication to customer satisfaction, and a drive to provide positive contributions to the society by doing business with the aim to provide simple, affordable but with high-quality solutions catering to the day to day hygiene and cleaning."}
              </p>
            </div>

            <div className="company-capabilities">
              <article className="company-capability company-capability--tts">
                <div className="company-capability__number">TTS</div>
                <div>
                  <span>AUTHORIZED RANGE</span>
                  <h3>TTS dealer</h3>
                  <p>
                    {content.about_tts_dealer ||
                      "We are the dealers of TTS Italy products and its accessories in UAE."}
                  </p>
                  <a href={categoryUrl("tts-products")}>Explore TTS products ↗</a>
                </div>
              </article>

              <article className="company-capability">
                <div className="company-capability__image">
                  <img
                    src="/imported-products/garbage-bag-transparent.png"
                    alt="Diamond Capital Oasis garbage bag manufacturing"
                    width="320"
                    height="320"
                  />
                </div>
                <div>
                  <span>400 MT PER MONTH</span>
                  <h3>Plastic Manufacturing unit</h3>
                  <p>
                    {content.about_plastic_manufacturing ||
                      "Our Plastic factory has a capacity to do 400 MT productions per month. Our plastic factory Concentrating more into the manufacturing of Garbage bags 100% Virgin Oxo biodegradable (HD & LD) Carry bags, Banana Cut Bags etc."}
                  </p>
                  <a href={categoryUrl("plastic-bags")}>Explore plastic bags ↗</a>
                </div>
              </article>

              <article className="company-capability">
                <div className="company-capability__image">
                  <img
                    src="/products/floor-cleaner.jpg"
                    alt="Diamond Capital Oasis detergent and disinfectant manufacturing"
                    width="320"
                    height="320"
                  />
                </div>
                <div>
                  <span>IN-HOUSE FORMULAS</span>
                  <h3>Detergent and Disinfectant manufacturing Unit</h3>
                  <p>
                    {content.about_detergent_manufacturing ||
                      "We produce a range of products such as All-purpose cleaner (General purpose cleaner), Hand Soap Liquid, Bleach, Glass cleaners, a variety of disinfectants etc."}
                  </p>
                  <a href={categoryUrl("detergent-disinfectants")}>
                    Explore cleaning chemicals ↗
                  </a>
                </div>
              </article>

              <article className="company-capability">
                <div className="company-capability__image">
                  <img
                    src="/products/maxi-roll.png"
                    alt="Diamond Capital Oasis paper products"
                    width="320"
                    height="320"
                  />
                </div>
                <div>
                  <span>100 MT PER MONTH</span>
                  <h3>Paper Products Factory</h3>
                  <p>
                    {content.about_paper_factory ||
                      "Our paper products factory has a capacity of 100 MT productions per month. We are concentrating more on the manufacturing of Facial Tissues, Maxi Rolls, interfold Tissues, Toilet Rolls, Paper Napkins etc. We are using 100% virgin pulp only."}
                  </p>
                  <a href={categoryUrl("tissue-products")}>Explore paper products ↗</a>
                </div>
              </article>

              <article className="company-capability company-capability--import">
                <div className="company-capability__number">I/E</div>
                <div>
                  <span>REGIONAL SOURCING</span>
                  <h3>Import and Export</h3>
                  <p>
                    {content.about_import_export ||
                      "Though our Group’s core business activities are diversified manufacturing, we also focus on cleaning products import and re-export."}
                  </p>
                  <a href="/catalog.html">Explore all cleaning products ↗</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section regional-story">
          <div className="shell regional-story__grid">
            <div className="regional-story__heading">
              <p className="eyebrow">REGIONAL SUPPLY</p>
              <h2>Quality products, responsive service and competitive value.</h2>
              <blockquote>
                {content.about_dominant_attributions ||
                  "Our Dominant attributions are Quality, Service provided with competitive price."}
              </blockquote>
            </div>
            <div className="regional-story__copy">
              <p>
                {content.about_regional_intro ||
                  "We offer a wide range of industrial, institutional and personal hygiene products to customers in the United Arab Emirates. As a Super Care products supplier in Muscat, Oman, we have a customer-oriented approach to doing business. We are known for the quality of products we offer in a speedy and cost-efficient way."}
              </p>
              <p>
                {content.about_workplace_hygiene ||
                  "Stocking your workplace with the right forms of hygiene goods will help you cause your work setting to be a pleasant environment. Hygiene items are important to maintain a neat and sanitary place of work. We offer these kinds of products in a wide variety. Take soap and hand sanitizer dispensers, for instance. Installing these kinds of dispensers in areas such as washrooms is among the best ways of preventing the transmission of germs. We provide a range of dispensers that you can install in office areas with heavy traffic."}
              </p>
              <p>
                {content.about_washroom_hygiene ||
                  "Hygienic washrooms pave the way for cleaner workplaces and other commercial environments, and we know this. This is why we deal in an array of quality hygiene products. Thoroughly go through our website to know more about what we offer in our capacity of being a Super Care products supplier in Muscat, Oman, and otherwise."}
              </p>
            </div>
          </div>
        </section>

        <section className="section timeline-section">
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">THE JOURNEY</p>
                <h2>Growing capability around customer needs.</h2>
              </div>
              <p>
                From manufacturing roots to a connected regional catalog, each
                step has expanded what customers can source from one partner.
              </p>
            </div>
            <div className="timeline">
              {milestones.map((item, index) => (
                <article key={item.year}>
                  <span>{`${index + 1}`.padStart(2, "0")}</span>
                  <strong>{item.year}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-cta">
          <div className="shell about-cta__inner">
            <div>
              <p className="eyebrow">WORK WITH DIAMOND CAPITAL OASIS</p>
              <h2>Put our regional range to work for your business.</h2>
            </div>
            <div>
              <a
                className="button button--light button--large"
                href="/catalog.html"
              >
                Explore products ↗
              </a>
              <a
                className="button button--ghost-light button--large"
                href="/contact.html"
              >
                Contact our team
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
