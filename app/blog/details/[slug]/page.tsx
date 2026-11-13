/* eslint-disable @next/next/no-img-element -- CMS blog images may use runtime-configured local or remote URLs. */
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "../../../../components/SiteFooter";
import { SiteHeader } from "../../../../components/SiteHeader";
import { getBlogPostPage } from "../../../../db/site";
import {
  legacyBlogPath,
  normalizeBlogSlug,
} from "../../../../lib/blog-content";
import {
  absoluteUrl,
  buildPageMetadata,
  jsonLd,
} from "../../../../lib/seo";

export const dynamic = "force-dynamic";

type BlogArticleProps = {
  params: Promise<{ slug: string }>;
};

const loadBlogPost = cache((slug: string) => getBlogPostPage(slug));

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function displayDate(value: string | null | undefined) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("en-AE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "";
}

function tagList(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: BlogArticleProps): Promise<Metadata> {
  const requestedSlug = (await params).slug;
  const data = await loadBlogPost(requestedSlug);
  if (!data) return { title: "Article not found" };

  const { post } = data;
  const canonicalPath = legacyBlogPath(post.slug);
  const metadata = buildPageMetadata({
    settings: data.setting,
    entry: data.seoEntry || undefined,
    fallbackTitle: `${post.title} | Diamond Capital Oasis`,
    fallbackDescription: post.excerpt,
    canonicalPath,
    image: post.featuredImageUrl || undefined,
    uniqueTitleQualifier: post.slug.endsWith("-1")
      ? "Tissue Dispensers Guide"
      : undefined,
  });
  const published = parseDate(post.publishedAt);
  const modified = parseDate(post.updatedAt);
  const tags = tagList(post.tags);

  return {
    ...metadata,
    openGraph: {
      ...(typeof metadata.openGraph === "object" && metadata.openGraph
        ? metadata.openGraph
        : {}),
      type: "article",
      publishedTime: published?.toISOString(),
      modifiedTime: modified?.toISOString(),
      authors: post.author ? [post.author] : undefined,
      section: post.category || undefined,
      tags: tags.length ? tags : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticleProps) {
  const requestedSlug = (await params).slug;
  const normalizedSlug = normalizeBlogSlug(requestedSlug);
  const data = await loadBlogPost(requestedSlug);
  if (!data) notFound();

  const { post } = data;
  const canonicalPath = legacyBlogPath(post.slug);
  if (
    normalizedSlug !== post.slug ||
    requestedSlug.toLowerCase() !== `${post.slug}.html`.toLowerCase()
  ) {
    permanentRedirect(canonicalPath);
  }

  const articleUrl = absoluteUrl(data.setting, canonicalPath);
  const published = parseDate(post.publishedAt);
  const modified = parseDate(post.updatedAt);
  const tags = tagList(post.tags);
  const siteName = data.setting.site_name || "Hygiene Links";
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImageUrl
      ? [absoluteUrl(data.setting, post.featuredImageUrl)]
      : undefined,
    datePublished: published?.toISOString(),
    dateModified: modified?.toISOString() || published?.toISOString(),
    articleSection: post.category || undefined,
    keywords: tags.length ? tags.join(", ") : undefined,
    author: {
      "@type": "Organization",
      name: post.author || siteName,
      url: absoluteUrl(data.setting, "/about.html"),
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl(data.setting, "/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(
          data.setting,
          data.setting.organization_logo || "/brand/hygiene-links-logo.png",
        ),
      },
    },
    url: articleUrl,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl(data.setting, "/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: absoluteUrl(data.setting, "/blog.html"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <SiteHeader settings={data.setting} />
      <main className="blog-article-page">
        <section className="blog-article-hero">
          <div className="shell">
            <div className="breadcrumbs breadcrumbs--light">
              <a href="/">Home</a>
              <span>/</span>
              <a href="/blog.html">Blog</a>
              <span>/</span>
              <span>{post.title}</span>
            </div>
            <div className="blog-article-hero__grid">
              <div className="blog-article-hero__copy">
                <p className="eyebrow">{post.category || "DIAMOND CAPITAL OASIS INSIGHT"}</p>
                <h1>{post.title}</h1>
                <p className="blog-article-hero__excerpt">{post.excerpt}</p>
                <div className="blog-article-byline">
                  <span>By {post.author || siteName}</span>
                  {published && (
                    <time dateTime={published.toISOString()}>
                      {displayDate(post.publishedAt)}
                    </time>
                  )}
                </div>
              </div>
              <div className="blog-article-hero__image">
                {post.featuredImageUrl ? (
                  <img
                    src={post.featuredImageUrl}
                    alt={post.imageAlt || post.title}
                    width="760"
                    height="560"
                  />
                ) : (
                  <span className="blog-image-placeholder" aria-hidden="true">
                    HL
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section blog-article">
          <div className="shell blog-article__layout">
            <article className="blog-article__main">
              <div
                className="blog-article__body"
                dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
              />
            </article>
            <aside className="blog-article__aside">
              <div className="blog-article__aside-card">
                <span>ARTICLE TOPIC</span>
                <strong>{post.category || "Cleaning & hygiene"}</strong>
                {tags.length > 0 && (
                  <div className="blog-article__tags" aria-label="Article tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="blog-article__aside-card blog-article__aside-card--accent">
                <span>NEED PRODUCT GUIDANCE?</span>
                <strong>Talk to our regional hygiene supply team.</strong>
                <a className="button button--primary" href="/contact.html">
                  Contact Diamond Capital Oasis ↗
                </a>
              </div>
            </aside>
          </div>
        </section>

        {data.relatedPosts.length > 0 && (
          <section className="section section--mist blog-related-section">
            <div className="shell">
              <div className="section-heading section-heading--split">
                <div>
                  <p className="eyebrow">KEEP READING</p>
                  <h2>Related insights</h2>
                </div>
                <a className="text-link" href="/blog.html">
                  View all articles <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="blog-grid">
                {data.relatedPosts.map((related) => {
                  const href = legacyBlogPath(related.slug);
                  const relatedDate = parseDate(related.publishedAt);
                  return (
                    <article className="blog-card" key={related.id}>
                      <a
                        className="blog-card__image"
                        href={href}
                        aria-label={`Read ${related.title}`}
                      >
                        {related.featuredImageUrl ? (
                          <img
                            src={related.featuredImageUrl}
                            alt={related.imageAlt || related.title}
                            width="560"
                            height="380"
                            loading="lazy"
                          />
                        ) : (
                          <span className="blog-image-placeholder" aria-hidden="true">
                            HL
                          </span>
                        )}
                      </a>
                      <div className="blog-card__copy">
                        <div className="blog-meta">
                          <span>{related.category || "Insights"}</span>
                          {relatedDate && (
                            <time dateTime={relatedDate.toISOString()}>
                              {displayDate(related.publishedAt)}
                            </time>
                          )}
                        </div>
                        <h2>
                          <a href={href}>{related.title}</a>
                        </h2>
                        <p>{related.excerpt}</p>
                        <a className="text-link" href={href}>
                          Read article <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter settings={data.setting} />
    </>
  );
}
