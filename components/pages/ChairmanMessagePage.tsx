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
    entry: data.seo["page:chairman"],
    fallbackTitle: "Chairman’s Message",
    fallbackDescription:
      "Read a message from Diamond Capital Oasis Chairman Mubarak Thallab Al Hajeri about sustainable growth, innovation and customer trust.",
    canonicalPath: "/chairmans-message.html",
  });
}

const fallbackMessage = [
  "Having started a venture 17 years ago, that had a simple beginning and that which has grown steady and stable, on the path to a roaring success today, I am privileged to be a founding member of one of the most competitive groups of companies that have made its mark and presence into plastic manufacturing, paper converting, detergents and disinfectants manufacturing, import and export of various cleaning products with emphasis on efficiency in operations, reliability for customers and trust on sustainable development, by catering to the present and with an eye on the future.",
  "For our group, sustainability signifies aligning the economic success with environmental and social responsibility. Our approach has the responsibility with a social dimension based on our belief that the long-term success of our organization depends on the existence of stable and economically viable communities.",
  "The changing face and the nature of the industry which faces a constant challenge to improve ourselves day by day allows us to gain invaluable experience and guides us to newer avenues and reach greater heights.",
  "We are now more accustomed to the importance of sustainable growth and learn insights and wisdom on sustainability and that leads to growth.",
  "Looking forward, we have merely reached the next level that each member of our group needs to focus on. Ensuring that the group will support by itself a sustainable growth regardless of external factors. We have the key success elements necessary to withstand the winds of change. The stimulation provided to build a highly skilled and creative research and development team is supported by the state-of-the-art infrastructure. Our well-recognized market presence with a broad product portfolio, which is being marked up with newer product ranges and efficient manufacturing capabilities that boast of high-quality production and cost-effectiveness.",
  "I would like to thank our group Management Colleagues, CEO, Directors, Employees, Customers, Suppliers, and other stakeholders, for their dedication and support in our constant endeavor to deliver high-quality products at an affordable cost. We are committed to improving the efficiencies in our operations and differentiating ourselves in the market-place through customer-focused innovation in product and services, so as to build a stronger and sustainable future for our group and for our associates.",
];

export default async function ChairmanMessagePage() {
  const data = await getSiteData();
  const { content, setting } = data;
  const paragraphs = fallbackMessage.map(
    (fallback, index) => content[`chairman_message_${index + 1}`] || fallback,
  );

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <section className="company-page-hero company-page-hero--chairman">
          <div className="shell company-page-hero__grid">
            <div>
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <a href="/about.html">About Us</a>
                <span>/</span>
                <span>Chairman’s Message</span>
              </div>
              <p className="eyebrow">LEADERSHIP</p>
              <h1>{content.chairman_title || "Chairman’s Message"}</h1>
              <p>
                A reflection on sustainable growth, responsible business and the
                long-term partnerships behind Diamond Capital Oasis.
              </p>
            </div>
            <div className="company-page-hero__monogram" aria-hidden="true">
              <span>HL</span>
              <small>Since 2006</small>
            </div>
          </div>
        </section>

        <CompanyPageNav active="chairman" />

        <section className="section chairman-message">
          <div className="shell chairman-message__grid">
            <aside className="chairman-profile">
              <div className="chairman-profile__image">
                <img
                  src={
                    content.chairman_image ||
                    "/brand/chairman-mubarak-al-hajeri.jpeg"
                  }
                  alt={content.chairman_name || "Mubarak Thallab Al Hajeri"}
                  width="750"
                  height="1050"
                />
              </div>
              <div className="chairman-profile__caption">
                <span>DIAMOND CAPITAL OASIS (HYGIENE LINKS GROUP)</span>
                <strong>
                  {content.chairman_name || "Mubarak Thallab Al Hajeri"}
                </strong>
                <small>{content.chairman_role || "Chairman"}</small>
              </div>
            </aside>

            <article className="chairman-letter">
              <div className="chairman-letter__mark" aria-hidden="true">
                “
              </div>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <footer>
                <span>With gratitude,</span>
                <strong>
                  {content.chairman_name || "Mubarak Thallab Al Hajeri"}
                </strong>
                <small>{content.chairman_role || "Chairman"}</small>
              </footer>
            </article>
          </div>
        </section>

        <section className="company-footer-cta">
          <div className="shell company-footer-cta__inner">
            <div>
              <p className="eyebrow">OUR PURPOSE</p>
              <h2>Discover the mission guiding our next chapter.</h2>
            </div>
            <a className="button button--light button--large" href="/vision-mission.html">
              Vision & Mission ↗
            </a>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
