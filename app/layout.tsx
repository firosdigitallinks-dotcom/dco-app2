import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { EnquiryCart } from "../components/EnquiryCart";
import { EnquiryDialog } from "../components/EnquiryDialog";
import { FloatingContactButtons } from "../components/FloatingContactButtons";
import { TrackingScripts } from "../components/TrackingScripts";
import { getSiteData } from "../db/site";
import { absoluteUrl, jsonLd, siteBaseUrl } from "../lib/seo";
import "./globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#140913",
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "diamondcapitaloasis.com";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const requestBase = `${protocol}://${host}`;
  const metadataBase = siteBaseUrl(data.setting, requestBase);
  const title =
    data.setting.default_meta_title ||
    "Diamond Capital Oasis | Professional Hygiene Products";
  const description =
    data.setting.default_meta_description ||
    "Diamond Capital Oasis (Division of Hygiene Links) - Professional cleaning chemicals, tissue products, tools and facility supplies across Oman, UAE and Qatar.";
  const ogImage = absoluteUrl(
    data.setting,
    data.setting.default_og_image || "/brand/dco-logo.png",
    requestBase,
  );
  const allowIndex = data.setting.robots_index !== "false";

  return {
    metadataBase,
    title: {
      default: title,
      template: "%s | Diamond Capital Oasis",
    },
    description,
    applicationName: "Diamond Capital Oasis",
    icons: {
      icon: "/brand/dco-mark.png",
      shortcut: "/brand/dco-mark.png",
      apple: "/brand/dco-mark.png",
    },
    openGraph: {
      type: "website",
      siteName: "Diamond Capital Oasis",
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1024,
          height: 578,
          alt: "Diamond Capital Oasis professional hygiene product catalog",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: allowIndex,
      follow: allowIndex,
    },
    verification: {
      google:
        data.setting.google_site_verification ||
        "RaAzq6JSBe41dVSgbY8_xdiBZrZjvZb_Jav1z7e2k7c",
      other: data.setting.bing_site_verification
        ? { "msvalidate.01": data.setting.bing_site_verification }
        : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getSiteData();
  const sameAs = [
    data.setting.social_facebook,
    data.setting.social_linkedin,
    data.setting.social_instagram,
    data.setting.social_x,
    data.setting.social_youtube,
  ].filter(Boolean);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteBaseUrl(data.setting).toString()}#organization`,
    name: data.setting.organization_name || "Diamond Capital Oasis",
    legalName:
      data.setting.organization_legal_name ||
      data.setting.organization_name ||
      "Diamond Capital Oasis LLC (Division of Hygiene Links)",
    url: siteBaseUrl(data.setting).toString(),
    logo: absoluteUrl(
      data.setting,
      data.setting.organization_logo || "/brand/dco-logo.png",
    ),
    email: data.setting.email,
    telephone: data.setting.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: data.setting.address,
      addressCountry: "OM",
    },
    areaServed: ["OM", "AE", "QA"],
    sameAs,
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteBaseUrl(data.setting).toString()}#website`,
    url: siteBaseUrl(data.setting).toString(),
    name: data.setting.site_name || "Diamond Capital Oasis",
    publisher: {
      "@id": `${siteBaseUrl(data.setting).toString()}#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(data.setting, "/catalog.html")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }}
        />
        <TrackingScripts settings={data.setting} />
        {children}
        <FloatingContactButtons
          phone={data.setting.phone || "+971 50 568 9879"}
          whatsapp={data.setting.whatsapp || "971505689879"}
        />
        <EnquiryCart
          whatsapp={data.setting.whatsapp || "971505689879"}
        />
        <EnquiryDialog />
      </body>
    </html>
  );
}
