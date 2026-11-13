import { LogoLockup } from "./LogoLockup";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { withBasePath } from "../lib/base-path";
import { whatsappLink } from "../lib/links";

type HeaderProps = {
  settings: Record<string, string>;
};

const navItems = [
  { label: "Home", href: "/" },
  {
    label: "About Us",
    href: "/about.html",
    children: [
      { label: "About Us", href: "/about.html" },
      { label: "Chairman’s Message", href: "/chairmans-message.html" },
      { label: "Vision & Mission", href: "/vision-mission.html" },
      { label: "FAQs", href: "/faq.html" },
    ],
  },
  { label: "Our Products", href: "/catalog.html" },
  { label: "Blog", href: "/blog.html" },
  { label: "Contact Us", href: "/contact.html" },
];

export function SiteHeader({ settings }: HeaderProps) {
  const whatsapp = whatsappLink(settings.whatsapp ?? "971505689879");
  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-bar__inner">
          <p>
            <span className="status-dot" />
            Regional supply across {settings.markets ?? "UAE · OMAN · QATAR"}
          </p>
          <div className="utility-bar__links">
            <a href={`tel:${(settings.phone ?? "").replace(/\s/g, "")}`}>
              <span className="utility-bar__contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
                </svg>
              </span>
              <span>{settings.phone ?? "+971 50 568 9879"}</span>
            </a>
            <a href={`mailto:${settings.email ?? "info@diamondcapitaloasis.com"}`}>
              <span className="utility-bar__contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
                  <path d="m3.5 6 8.5 7 8.5-7" />
                </svg>
              </span>
              <span>{settings.email ?? "info@diamondcapitaloasis.com"}</span>
            </a>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="shell site-header__inner">
          <a className="brand-link" href={withBasePath("/")} aria-label="Diamond Capital Oasis home">
            <LogoLockup />
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            {navItems.map((item) =>
              item.children ? (
                <div className="desktop-nav__item" key={item.href}>
                  <a className="desktop-nav__parent" href={withBasePath(item.href)}>
                    {item.label}
                    <span aria-hidden="true">⌄</span>
                  </a>
                  <div className="desktop-subnav">
                    <span className="desktop-subnav__label">OUR COMPANY</span>
                    {item.children.map((child) => (
                      <a key={child.href} href={withBasePath(child.href)}>
                        <span>{child.label}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a key={item.href} href={withBasePath(item.href)}>
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="header-actions">
            <form className="header-search" action={withBasePath("/catalog.html")} role="search">
              <label className="sr-only" htmlFor="header-search">
                Search the product catalog
              </label>
              <input
                id="header-search"
                name="q"
                type="search"
                placeholder="Search products or SKU"
              />
              <button type="submit" aria-label="Search">
                ↗
              </button>
            </form>
            <a className="button button--primary button--compact" href={whatsapp}>
              <WhatsAppIcon compact />
              Request a quote
            </a>
          </div>

          <details className="mobile-menu">
            <summary aria-label="Open navigation">
              <span />
              <span />
              <span />
            </summary>
            <div className="mobile-menu__panel">
              <form action={withBasePath("/catalog.html")} role="search">
                <label htmlFor="mobile-search">Search products</label>
                <input
                  id="mobile-search"
                  name="q"
                  type="search"
                  placeholder="Name or SKU"
                />
              </form>
              <nav aria-label="Mobile navigation">
                {navItems.map((item) =>
                  item.children ? (
                    <details className="mobile-subnav" key={item.href}>
                      <summary>
                        {item.label}
                        <span>⌄</span>
                      </summary>
                      <div>
                        {item.children.map((child) => (
                          <a key={child.href} href={withBasePath(child.href)}>
                            {child.label}
                            <span>↗</span>
                          </a>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <a key={item.href} href={withBasePath(item.href)}>
                      {item.label}
                      <span>↗</span>
                    </a>
                  ),
                )}
              </nav>
              <a className="button button--primary" href={whatsapp}>
                <WhatsAppIcon />
                Enquire on WhatsApp
              </a>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}
