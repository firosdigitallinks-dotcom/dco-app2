import type { MetadataRoute } from "next";
import {
  getPublishedBlogSitemapEntries,
  getSiteData,
} from "../db/site";
import { categoryUrl } from "../lib/category-url";
import { absoluteUrl } from "../lib/seo";

export const dynamic = "force-dynamic";

const BLOG_PAGE_SIZE = 12;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSiteData();
  const blogEntries = await getPublishedBlogSitemapEntries();
  const staticPageDefinitions: Array<
    MetadataRoute.Sitemap[number] & { seoKey: string }
  > = [
    {
      seoKey: "page:home",
      url: absoluteUrl(data.setting, "/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      seoKey: "page:catalog",
      url: absoluteUrl(data.setting, "/catalog.html"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      seoKey: "page:about",
      url: absoluteUrl(data.setting, "/about.html"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      seoKey: "page:chairman",
      url: absoluteUrl(data.setting, "/chairmans-message.html"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      seoKey: "page:vision-mission",
      url: absoluteUrl(data.setting, "/vision-mission.html"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      seoKey: "page:blog",
      url: absoluteUrl(data.setting, "/blog.html"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      seoKey: "page:contact",
      url: absoluteUrl(data.setting, "/contact.html"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
  const staticPages: MetadataRoute.Sitemap = staticPageDefinitions
    .filter(({ seoKey }) => data.seo[seoKey]?.robotsIndex !== false)
    .map(({ url, changeFrequency, priority }) => ({
      url,
      changeFrequency,
      priority,
    }));
  const categoryPages: MetadataRoute.Sitemap = data.categories
    .filter(
      (category) =>
        data.seo[`category:${category.id}`]?.robotsIndex !== false,
    )
    .map(
    (category) => ({
      url: absoluteUrl(
        data.setting,
        categoryUrl(category.slug),
      ),
      lastModified: new Date(category.updatedAt),
      changeFrequency: "weekly",
      priority: category.parentId ? 0.7 : 0.8,
    }),
  );
  const productPages: MetadataRoute.Sitemap = data.products
    .filter(
      (product) =>
        product.status === "published" &&
        data.seo[`product:${product.id}`]?.robotsIndex !== false,
    )
    .map((product) => ({
      url: absoluteUrl(data.setting, `/product/${product.slug}.html`),
      lastModified: new Date(product.updatedAt),
      changeFrequency: "monthly",
      priority: product.featured ? 0.8 : 0.7,
    }));
  const blogPages: MetadataRoute.Sitemap = blogEntries
    .filter((post) => data.seo[`blog:${post.id}`]?.robotsIndex !== false)
    .map((post) => ({
      url: absoluteUrl(
        data.setting,
        `/blog/details/${post.slug}.html`,
      ),
      lastModified: new Date(
        post.updatedAt.includes("T")
          ? post.updatedAt
          : `${post.updatedAt.replace(" ", "T")}Z`,
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  const blogArchivePages: MetadataRoute.Sitemap =
    data.seo["page:blog"]?.robotsIndex === false
      ? []
      : Array.from(
          { length: Math.max(0, Math.ceil(blogEntries.length / BLOG_PAGE_SIZE) - 1) },
          (_, index) => ({
            url: absoluteUrl(data.setting, `/blog.html?page=${index + 2}`),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          }),
        );

  return [
    ...staticPages,
    ...blogArchivePages,
    ...categoryPages,
    ...productPages,
    ...blogPages,
  ];
}
