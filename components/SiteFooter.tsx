import { LogoLockup } from "./LogoLockup";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { withBasePath } from "../lib/base-path";
import { categoryUrl } from "../lib/category-url";
import { whatsappLink } from "../lib/links";

function safeSocialUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function SiteFooter({
  settings,
}: {
  settings: Record<string, string>;
}) {
  const email = settings.email ?? "info@diamondcapitaloasis.com";
  const socialProfiles = [
    {
      name: "Facebook",
      url: safeSocialUrl(settings.social_facebook),
      icon: withBasePath("/social-icons/facebook.png"),
    },
    {
      name: "Instagram",
      url: safeSocialUrl(settings.social_instagram),
      icon: withBasePath("/social-icons/instagram.png"),
    },
    {
      name: "LinkedIn",
      url: safeSocialUrl(settings.social_linkedin),
      icon: withBasePath("/social-icons/linkedin.png"),
    },
    {
      name: "X",
      url: safeSocialUrl(settings.social_x),
      icon: withBasePath("/social-icons/x.png"),
    },
    {
      name: "YouTube",
      url: safeSocialUrl(settings.social_youtube),
      icon: withBasePath("/social-icons/youtube.png"),
    },
  ].filter((profile) => profile.url);

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main">
          <div className="footer-brand">
            <a href={withBasePath("/")} aria-label="Diamond Capital Oasis home">
              <LogoLockup inverse />
            </a>
            <p>
              A one-stop solution for professional hygiene, facility care and
              customized supply across Oman, the UAE and the Gulf region.
            </p>
            <div className="footer-socials" aria-label="Social media">
              {socialProfiles.map((profile) => (
                <a
                  href={profile.url}
                  aria-label={profile.name}
                  key={profile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={profile.name}
                >
                  <img src={profile.icon} alt="" width="38" height="38" />
                </a>
              ))}
              <a
                className="footer-socials__whatsapp"
                href={whatsappLink(settings.whatsapp ?? "971505689879")}
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
              >
                <WhatsAppIcon compact />
              </a>
            </div>
          </div>

          <div>
            <h2>Explore</h2>
            <a href={withBasePath("/")}>Home</a>
            <a href={withBasePath("/about.html")}>About us</a>
            <a href={withBasePath("/chairmans-message.html")}>Chairman’s message</a>
            <a href={withBasePath("/vision-mission.html")}>Vision & mission</a>
            <a href={withBasePath("/catalog.html")}>Our products</a>
            <a href={withBasePath("/blog.html")}>Blog</a>
            <a href={withBasePath("/contact.html")}>Contact us</a>
          </div>
          <div>
            <h2>Popular ranges</h2>
            <a href={categoryUrl("chemicals-disinfectants")}>Chemicals</a>
            <a href={categoryUrl("tissue-paper")}>Tissue & paper</a>
            <a href={categoryUrl("cleaning-tools-floor-care")}>
              Tools & floor care
            </a>
            <a href={categoryUrl("packaging-jerry-cans")}>Jerry cans</a>
          </div>
          <div>
            <h2>Get in touch</h2>
            <a
              className="footer-contact-link"
              href={`tel:${(settings.phone ?? "").replace(/\s/g, "")}`}
            >
              <span className="footer-contact-link__icon" aria-hidden="true">
                ☎
              </span>
              <span>
                <small>Phone</small>
                <strong>{settings.phone ?? "+971 50 568 9879"}</strong>
              </span>
            </a>
            <a className="footer-contact-link" href={`mailto:${email}`}>
              <span className="footer-contact-link__icon" aria-hidden="true">
                ✉
              </span>
              <span>
                <small>Email</small>
                <strong>{email}</strong>
              </span>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Diamond Capital Oasis (Division of Hygiene Links)</span>
          <span>Manufacturer · Importer · Exporter</span>
        </div>
      </div>
    </footer>
  );
}
