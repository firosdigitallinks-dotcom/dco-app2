/* eslint-disable @next/next/no-img-element -- CMS blog images may use runtime-configured local or remote URLs. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "../SiteFooter";
import { SiteHeader } from "../SiteHeader";
import { getPublishedBlogPosts } from "../../db/site";
import { buildPageMetadata } from "../../lib/seo";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type BlogPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

type BlogListingPost = Awaited<
  ReturnType<typeof getPublishedBlogPosts>
>["posts"][number];

function readPage(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(candidate || "1", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function blogListingPath(page: number) {
  return page > 1 ? `/blog.html?page=${page}` : "/blog.html";
}

function blogPostPath(slug: string) {
  return `/blog/details/${slug}.html`;
}

function paginationItems(currentPage: number, totalPages: number) {
  const pages = new Set(
    [1, totalPages, currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2].filter(
      (page) => page >= 1 && page <= totalPages,
    ),
  );
  const sortedPages = [...pages].sort((left, right) => left - right);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function parsePublishedDate(value: string | null) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function displayDate(value: string | null) {
  const date = parsePublishedDate(value);
  return date
    ? new Intl.DateTimeFormat("en-AE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Diamond Capital Oasis insight";
}

function decodeDisplayText(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(
    /&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi,
    (entity, token: string) => {
      if (token.startsWith("#")) {
        const hexadecimal = token[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(token.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        return Number.isSafeInteger(codePoint) && codePoint > 0
          ? String.fromCodePoint(codePoint)
          : entity;
      }

      return namedEntities[token.toLowerCase()] ?? entity;
    },
  );
}

function BlogCard({ post }: { post: BlogListingPost }) {
  const href = blogPostPath(post.slug);
  const published = parsePublishedDate(post.publishedAt);
  const title = decodeDisplayText(post.title);
  const category = decodeDisplayText(post.category || "Insights");
  const excerpt = decodeDisplayText(post.excerpt);

  return (
    <article className="blog-card">
      <a className="blog-card__image" href={href} aria-label={`Read ${title}`}>
        {post.featuredImageUrl ? (
          <img
            src={post.featuredImageUrl}
            alt={decodeDisplayText(post.imageAlt || post.title)}
            width="560"
            height="380"
            loading="lazy"
          />
        ) : (
          <span className="blog-image-placeholder" aria-hidden="true">
            HL
          </span>
        )}
        <span className="blog-card__category">
          {category}
        </span>
      </a>
      <div className="blog-card__copy">
        {published ? (
          <time className="blog-card__date" dateTime={published.toISOString()}>
            {displayDate(post.publishedAt)}
          </time>
        ) : (
          <span className="blog-card__date">Diamond Capital Oasis insight</span>
        )}
        <h2>
          <a href={href}>{title}</a>
        </h2>
        <p>{excerpt}</p>
        <a className="blog-card__link" href={href}>
          <span>Read article</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const page = readPage((await searchParams).page);
  const data = await getPublishedBlogPosts({ page, pageSize: PAGE_SIZE });
  const canonicalPath = blogListingPath(page);
  const savedEntry = data.seo["page:blog"];
  const entry =
    savedEntry && page > 1
      ? {
          ...savedEntry,
          metaTitle: `${savedEntry.metaTitle || "Diamond Capital Oasis insights"} – Page ${page}`,
          canonicalPath,
          ogTitle: `${savedEntry.ogTitle || savedEntry.metaTitle || "Diamond Capital Oasis insights"} – Page ${page}`,
        }
      : savedEntry;

  return buildPageMetadata({
    settings: data.setting,
    entry,
    fallbackTitle:
      page > 1
        ? `Professional Cleaning and Facility Care Insights – Page ${page}`
        : "Professional Cleaning and Facility Care Insights",
    fallbackDescription:
      "Read practical guidance from Diamond Capital Oasis on professional cleaning products, facility care, washrooms and responsible hygiene supply.",
    canonicalPath,
  });
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const page = readPage((await searchParams).page);
  const data = await getPublishedBlogPosts({ page, pageSize: PAGE_SIZE });
  const { content, setting } = data;

  if (data.total > 0 && page > data.totalPages) notFound();

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        <section className="page-hero page-hero--blog">
          <div className="shell page-hero__grid">
            <div className="blog-hero__copy">
              <div className="breadcrumbs breadcrumbs--light">
                <a href="/">Home</a>
                <span>/</span>
                <span>Blog</span>
              </div>
              <p className="eyebrow">DIAMOND CAPITAL OASIS INSIGHTS</p>
              <h1>{content.blog_title || "Cleaning and hygiene insights"}</h1>
              <p>
                {content.blog_body ||
                  "Practical guidance for facility, procurement and housekeeping teams across the Gulf."}
              </p>
            </div>
            <div className="blog-hero__panel">
              <p>THE KNOWLEDGE DESK</p>
              <strong>Clarity for every cleaner, safer space.</strong>
              <span>
                Regional expertise for procurement, housekeeping and facility-care
                professionals.
              </span>
            </div>
          </div>
        </section>

        <section className="section blog-archive-section">
          <div className="shell">
            <div className="blog-archive-heading">
              <div>
                <p className="eyebrow">
                  {page > 1 ? `ARTICLES · PAGE ${page}` : "LATEST ARTICLES"}
                </p>
                <h2>Ideas for better daily decisions.</h2>
              </div>
              <div className="blog-archive-heading__meta">
                <span>PAGE {page} OF {data.totalPages || 1}</span>
                <p>
                  Professional cleaning, hygiene, facility care and responsible
                  supply.
                </p>
              </div>
            </div>

            {data.posts.length > 0 ? (
              <div className="blog-grid">
                {data.posts.map((post) => (
                  <BlogCard post={post} key={post.id} />
                ))}
              </div>
            ) : (
              <div className="empty-results">
                <h2>Insights are coming soon.</h2>
                <p>Contact our team for product and facility-care guidance.</p>
                <a className="button button--primary" href="/contact.html">
                  Contact our team
                </a>
              </div>
            )}

            {data.totalPages > 1 && (
              <nav className="blog-pagination" aria-label="Blog pages">
                {page > 1 && (
                  <a href={blogListingPath(page - 1)} rel="prev">
                    <span aria-hidden="true">←</span> Previous
                  </a>
                )}
                <div>
                  {paginationItems(page, data.totalPages).map((item, index) => {
                    if (item === "ellipsis") {
                      return (
                        <span
                          className="blog-pagination__ellipsis"
                          aria-hidden="true"
                          key={`ellipsis-${index}`}
                        >
                          …
                        </span>
                      );
                    }
                    const targetPage = item;
                    return targetPage === page ? (
                      <span aria-current="page" key={targetPage}>
                        {targetPage}
                      </span>
                    ) : (
                      <a href={blogListingPath(targetPage)} key={targetPage}>
                        <span className="sr-only">Blog page </span>
                        {targetPage}
                      </a>
                    );
                  })}
                </div>
                {page < data.totalPages && (
                  <a href={blogListingPath(page + 1)} rel="next">
                    Next <span aria-hidden="true">→</span>
                  </a>
                )}
              </nav>
            )}
          </div>
        </section>

        <section className="blog-cta">
          <div className="shell blog-cta__inner">
            <div>
              <p className="eyebrow">NEED PRODUCT-SPECIFIC GUIDANCE?</p>
              <h2>Talk to a team that understands professional facilities.</h2>
            </div>
            <a className="button button--light button--large" href="/contact.html">
              Contact us ↗
            </a>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
