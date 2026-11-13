import type { Metadata } from "next";
import { CompanyPageNav } from "../CompanyPageNav";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { getSiteData } from "../../db/site";
import { buildPageMetadata } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    entry: data.seo["page:vision-mission"],
    fallbackTitle: "Vision & Mission",
    fallbackDescription:
      "Explore the vision, mission, environmental policy and values that guide Diamond Capital Oasis.",
    canonicalPath: "/vision-mission.html",
  });
}

export default async function VisionMissionPage() {
  const data = await getSiteData();
  const { content, setting } = data;

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <section className="company-page-hero company-page-hero--purpose">
          <div className="shell company-page-hero__grid">
            <div>
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <a href="/about.html">About Us</a>
                <span>/</span>
                <span>Vision & Mission</span>
              </div>
              <p className="eyebrow">OUR PURPOSE</p>
              <h1>{content.vision_mission_title || "Vision & Mission"}</h1>
              <p>
                The principles that shape our products, partnerships and
                responsibility to the communities we serve.
              </p>
            </div>
            <div className="purpose-orbit" aria-hidden="true">
              <span>Vision</span>
              <span>Mission</span>
              <strong>HL</strong>
            </div>
          </div>
        </section>

        <CompanyPageNav active="vision" />

        <section className="section purpose-statements">
          <div className="shell purpose-statements__grid">
            <article className="purpose-card purpose-card--vision">
              <div className="purpose-card__icon" aria-hidden="true">V</div>
              <p className="eyebrow">VISION</p>
              <h2>A preferred, versatile hygiene group.</h2>
              <p>
                {content.vision_statement ||
                  "Be the preferred versatile group that provides cost-effective and innovative products in Facilities and housekeeping, providing products and services to hospitality sector through professionalism and cohesiveness"}
              </p>
            </article>
            <article className="purpose-card purpose-card--mission">
              <div className="purpose-card__icon" aria-hidden="true">M</div>
              <p className="eyebrow">MISSION</p>
              <h2>Responsible solutions for everyday hygiene.</h2>
              <p>
                {content.mission_statement ||
                  "By harnessing and utilizing the environment that creates user-friendly, eco-friendly, biodegradable, high-quality cleaning and chemical solutions ranging from cleaning, plastic, and paper products that are resourceful and takes care of the day to day housekeeping needs."}
              </p>
              <blockquote>
                “{content.mission_tagline || "A one-stop solution for all your hygiene needs"}”
              </blockquote>
            </article>
          </div>
        </section>

        <section className="section environment-policy">
          <div className="shell environment-policy__grid">
            <div className="environment-policy__heading">
              <p className="eyebrow">ENVIRONMENTAL POLICY</p>
              <h2>Following the concept of “green clean”.</h2>
              <div className="eco-seal" aria-hidden="true">
                <span>GREEN</span>
                <strong>✓</strong>
                <small>CLEAN</small>
              </div>
            </div>
            <div className="environment-policy__copy">
              <p>
                {content.environment_policy_1 ||
                  "For the environmentally conscious, Hygiene Links Supply source boasts of a full line of environmentally friendly “Green” products. The impact of the cleaning industry on our planet is tremendous. If you wish to be environmentally conscious, let Diamond Capital Oasis supply source be your “Green” advisor today!"}
              </p>
              <p>
                {content.environment_policy_2 ||
                  "We comply with global standard environmental regulation, and follow the concept “green clean”"}
              </p>
            </div>
          </div>
        </section>

        <section className="section company-values">
          <div className="shell company-values__grid">
            <div>
              <p className="eyebrow">VALUES</p>
              <h2>
                {content.values_statement ||
                  "Integrity, Excellence, diverse and strive to “walk the talk”"}
              </h2>
            </div>
            <div className="company-values__promise">
              <p>
                {content.values_commitment ||
                  "Our group is dedicated and committed to providing our customers with the best quality products and services."}
              </p>
              <strong>
                {content.values_closing || "We look forward to serving you!"}
              </strong>
              <a className="button button--primary" href="/contact.html">
                Contact our team ↗
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
