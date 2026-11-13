"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type { BlogPost, SeoEntry } from "../db/site";

type BlogDraft = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  featuredImageUrl: string;
  imageAlt: string;
  author: string;
  category: string;
  tags: string;
  publishedAt: string;
  status: "draft" | "published";
  featured: boolean;
  sortOrder: number;
  sourceUrl: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  robotsIndex: boolean;
};

function emptyBlog(): BlogDraft {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    bodyHtml: "",
    featuredImageUrl: "",
    imageAlt: "",
    author: "Hygiene Links",
    category: "Cleaning & Hygiene",
    tags: "",
    publishedAt: now.toISOString().slice(0, 16),
    status: "draft",
    featured: false,
    sortOrder: 100,
    sourceUrl: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    robotsIndex: true,
  };
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

function toDraft(post: BlogPost, seoEntry?: SeoEntry): BlogDraft {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    featuredImageUrl: post.featuredImageUrl,
    imageAlt: post.imageAlt,
    author: post.author,
    category: post.category,
    tags: post.tags,
    publishedAt: toLocalDateTime(post.publishedAt),
    // Opening an archived record prepares it as a draft. Saving it can then
    // deliberately restore it without allowing "archived" to bypass the
    // dedicated archive action and its SEO noindex update.
    status: post.status === "published" ? "published" : "draft",
    featured: post.featured,
    sortOrder: post.sortOrder,
    sourceUrl: post.sourceUrl ?? "",
    metaTitle: seoEntry?.metaTitle ?? "",
    metaDescription: seoEntry?.metaDescription ?? "",
    keywords: seoEntry?.keywords ?? "",
    ogTitle: seoEntry?.ogTitle ?? "",
    ogDescription: seoEntry?.ogDescription ?? "",
    robotsIndex: seoEntry?.robotsIndex ?? true,
  };
}

export function BlogManager({
  posts,
  seoEntries,
  onChanged,
}: {
  posts: BlogPost[];
  seoEntries: SeoEntry[];
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<BlogDraft>(emptyBlog());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const filteredPosts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) =>
      `${post.title} ${post.slug} ${post.category} ${post.author}`
        .toLowerCase()
        .includes(needle),
    );
  }, [posts, query]);

  function openPost(post: BlogPost) {
    setDraft(
      toDraft(
        post,
        seoEntries.find((entry) => entry.key === `blog:${post.id}`),
      ),
    );
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function callAction(action: string, payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "The blog change could not be saved.");
    }
    await onChanged();
  }

  async function savePost(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await callAction("saveBlogPost", {
        ...draft,
        publishedAt: draft.publishedAt
          ? `${draft.publishedAt.replace("T", " ")}:00`
          : null,
      });
      setDraft(emptyBlog());
      setNotice("Blog post saved. Published posts are now live on the website.");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to save the blog post.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "The image could not be uploaded.");
      }
      setDraft((current) => ({ ...current, featuredImageUrl: result.url ?? "" }));
      setNotice("Image uploaded. Save the post to publish it.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">EDITORIAL LIBRARY</p>
          <h2>Manage every article and its search appearance.</h2>
          <p>
            Imported formatting is preserved as safe HTML. Draft or archived posts
            stay out of the public blog and sitemap.
          </p>
        </div>
        <button
          className="button button--outline"
          type="button"
          onClick={() => setDraft(emptyBlog())}
        >
          Add new article
        </button>
      </div>

      {(notice || error) && (
        <div className={`admin-notice${error ? " admin-notice--error" : ""}`}>
          {error || notice}
        </div>
      )}

      <div className="admin-editor-layout admin-blog-editor">
        <form className="admin-form-card" onSubmit={savePost}>
          <div className="admin-form-card__header">
            <div>
              <p className="eyebrow">{draft.id ? "EDIT ARTICLE" : "NEW ARTICLE"}</p>
              <h2>{draft.id ? draft.title : "Create a blog post"}</h2>
            </div>
            {draft.id && (
              <button className="text-button" type="button" onClick={() => setDraft(emptyBlog())}>
                Clear
              </button>
            )}
          </div>

          <div className="admin-field-grid">
            <label className="admin-field admin-field--wide">
              <span>Article title *</span>
              <input
                required
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>URL slug</span>
              <input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                placeholder="Created from the title"
              />
              <small>
                Public URL: /blog/details/{draft.slug || "article-title"}.html
              </small>
            </label>
            <label className="admin-field">
              <span>Category</span>
              <input
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Author</span>
              <input
                value={draft.author}
                onChange={(event) => setDraft({ ...draft, author: event.target.value })}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Short summary</span>
              <textarea
                rows={4}
                value={draft.excerpt}
                onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
              />
              <small>Used on the blog listing and as the default meta description.</small>
            </label>
            <label className="admin-field admin-field--wide">
              <span>Full article content *</span>
              <textarea
                className="admin-blog-body-editor"
                required
                rows={24}
                value={draft.bodyHtml}
                onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })}
              />
              <small>
                Safe headings, paragraphs, lists, links, tables and images are supported;
                scripts and unsafe attributes are removed automatically.
              </small>
            </label>
            <label className="admin-field admin-field--wide">
              <span>Featured image</span>
              <div className="admin-image-field">
                <div className="admin-image-preview admin-image-preview--blog">
                  {draft.featuredImageUrl ? (
                    <img src={draft.featuredImageUrl} alt="" />
                  ) : (
                    <span>No image</span>
                  )}
                </div>
                <div>
                  <input
                    value={draft.featuredImageUrl}
                    onChange={(event) =>
                      setDraft({ ...draft, featuredImageUrl: event.target.value })
                    }
                    placeholder="/media/... or /imported-blogs/..."
                  />
                  <label className="upload-button">
                    {uploading ? "Uploading…" : "Upload article image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadImage}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </label>
            <label className="admin-field admin-field--wide">
              <span>Image alternative text</span>
              <input
                value={draft.imageAlt}
                onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })}
                placeholder="Describe what is visible in the image"
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Tags</span>
              <input
                value={draft.tags}
                onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                placeholder="cleaning equipment, facility care, UAE"
              />
            </label>
            <label className="admin-field">
              <span>Publication date</span>
              <input
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Visibility</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as BlogDraft["status"],
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Display order</span>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  setDraft({ ...draft, sortOrder: Number(event.target.value) })
                }
              />
            </label>
            <label className="admin-index-toggle">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
              />
              <span>
                Feature this article
                <small>The newest featured article leads the blog landing page.</small>
              </span>
            </label>

            <div className="admin-seo-fields admin-field--wide">
              <div className="admin-subheading">
                <span>Search and social appearance</span>
                <small>Each published article receives its own canonical and BlogPosting schema.</small>
              </div>
              <div className="admin-field-grid">
                <label className="admin-field admin-field--wide">
                  <span>Meta title</span>
                  <input
                    maxLength={160}
                    value={draft.metaTitle}
                    onChange={(event) => setDraft({ ...draft, metaTitle: event.target.value })}
                    placeholder="Defaults to the article title"
                  />
                  <small>{draft.metaTitle.length}/60 recommended characters</small>
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Meta description</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={draft.metaDescription}
                    onChange={(event) =>
                      setDraft({ ...draft, metaDescription: event.target.value })
                    }
                    placeholder="Defaults to the short summary"
                  />
                  <small>{draft.metaDescription.length}/160 recommended characters</small>
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Target keywords</span>
                  <input
                    value={draft.keywords}
                    onChange={(event) => setDraft({ ...draft, keywords: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>Social title</span>
                  <input
                    value={draft.ogTitle}
                    onChange={(event) => setDraft({ ...draft, ogTitle: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>Social description</span>
                  <input
                    value={draft.ogDescription}
                    onChange={(event) => setDraft({ ...draft, ogDescription: event.target.value })}
                  />
                </label>
                <label className="admin-index-toggle admin-field--wide">
                  <input
                    type="checkbox"
                    checked={draft.robotsIndex}
                    onChange={(event) =>
                      setDraft({ ...draft, robotsIndex: event.target.checked })
                    }
                  />
                  <span>
                    Allow search engines to index this article
                    <small>Draft and archived posts are excluded regardless of this setting.</small>
                  </span>
                </label>
              </div>
            </div>

            {draft.sourceUrl && (
              <label className="admin-field admin-field--wide">
                <span>Imported source URL</span>
                <input value={draft.sourceUrl} readOnly />
              </label>
            )}
          </div>

          <button className="button button--primary button--wide" disabled={saving || uploading}>
            {saving ? "Saving…" : "Save blog post"}
          </button>
        </form>

        <div className="admin-list-card">
          <div className="admin-list-card__header">
            <div>
              <p className="eyebrow">ARTICLE LIBRARY</p>
              <h2>{posts.length} blog posts</h2>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search articles"
              aria-label="Search blog posts"
            />
          </div>
          <div className="admin-blog-list">
            {filteredPosts.map((post) => (
              <article key={post.id}>
                <div className="admin-list-image">
                  {post.featuredImageUrl ? (
                    <img src={post.featuredImageUrl} alt="" />
                  ) : (
                    <span>{post.title.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <strong>{post.title}</strong>
                  <span>
                    {post.category} · {post.publishedAt?.slice(0, 10) || "No date"}
                  </span>
                </div>
                <span className={`admin-status admin-status--${post.status}`}>
                  {post.status}
                </span>
                {post.status === "published" ? (
                  <a
                    className="table-action"
                    href={`/blog/details/${post.slug}.html`}
                    target="_blank"
                  >
                    View
                  </a>
                ) : (
                  <span />
                )}
                <button className="table-action" type="button" onClick={() => openPost(post)}>
                  Edit
                </button>
                <button
                  className="table-action table-action--danger"
                  type="button"
                  disabled={post.status === "archived"}
                  onClick={async () => {
                    if (!window.confirm(`Archive ${post.title}?`)) return;
                    setSaving(true);
                    setError("");
                    try {
                      await callAction("archiveBlogPost", { id: post.id });
                      if (draft.id === post.id) setDraft(emptyBlog());
                      setNotice("Article archived. Its record remains available in the CMS.");
                    } catch (actionError) {
                      setError(
                        actionError instanceof Error
                          ? actionError.message
                          : "Unable to archive the article.",
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Archive
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
