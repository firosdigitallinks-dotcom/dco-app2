const companyPages = [
  { id: "about", label: "About Us", href: "/about.html" },
  {
    id: "chairman",
    label: "Chairman’s Message",
    href: "/chairmans-message.html",
  },
  {
    id: "vision",
    label: "Vision & Mission",
    href: "/vision-mission.html",
  },
] as const;

export function CompanyPageNav({
  active,
}: {
  active: (typeof companyPages)[number]["id"] | "faq";
}) {
  return (
    <nav className="company-page-nav" aria-label="About Diamond Capital Oasis">
      <div className="shell company-page-nav__inner">
        {companyPages.map((page) => (
          <a
            key={page.id}
            className={page.id === active ? "is-active" : ""}
            href={page.href}
            aria-current={page.id === active ? "page" : undefined}
          >
            <span>{page.label}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
