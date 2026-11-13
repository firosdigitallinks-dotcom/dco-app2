import type { MetadataRoute } from "next";
import { getSiteData } from "../db/site";
import { absoluteUrl, siteBaseUrl } from "../lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const data = await getSiteData();
  const allowIndex = data.setting.robots_index !== "false";

  return {
    rules: allowIndex
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/api/"],
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: absoluteUrl(data.setting, "/sitemap.xml"),
    host: siteBaseUrl(data.setting).hostname,
  };
}

