import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Page not found | Diamond Capital Oasis",
  robots: { index: false, follow: false },
};

const settings = {
  phone: "+971 50 568 9879",
  email: "info@hygienelinks.com",
  whatsapp: "971505689879",
  markets: "UAE · OMAN · QATAR",
  address: "Dubai Investment Park 1, Dubai, UAE",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader settings={settings} />
      <main className="not-found">
        <div className="shell">
          <span>404</span>
          <p className="eyebrow">PAGE NOT FOUND</p>
          <h1>Let’s get you back to the catalog.</h1>
          <p>
            The page may have moved, but our product ranges and enquiry team are
            ready.
          </p>
          <div>
            <a className="button button--primary" href="/catalog.html">
              Browse products
            </a>
            <a className="button button--outline" href="/contact.html">
              Contact us
            </a>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
