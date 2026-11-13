"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  BlogPost,
  CatalogEditorial,
  Category,
  ClientLogo,
  ContentBlock,
  Inquiry,
  Product,
  SeoEntry,
  SiteSetting,
} from "../db/site";
import { categoryUrl } from "../lib/category-url";
import { BlogManager } from "./BlogManager";
import { CatalogEditorialManager } from "./CatalogEditorialManager";

type AdminData = {
  categories: Category[];
  products: Product[];
  contentBlocks: ContentBlock[];
  catalogEditorials: CatalogEditorial[];
  settings: SiteSetting[];
  seoEntries: SeoEntry[];
  inquiries: Inquiry[];
  clientLogos: ClientLogo[];
  blogs: BlogPost[];
};

type ClientLogoDraft = {
  id: string;
  name: string;
  imageUrl: string;
  websiteUrl: string;
  market: string;
  published: boolean;
  sortOrder: number;
};

type ProductDraft = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  summary: string;
  description: string;
  imageUrl: string;
  packSize: string;
  applications: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  robotsIndex: boolean;
  featured: boolean;
  eco: boolean;
  status: "draft" | "published";
  sortOrder: number;
};

type CategoryDraft = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  imageUrl: string;
  accent: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  robotsIndex: boolean;
  featured: boolean;
  sortOrder: number;
};

const tabs = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["categories", "Categories"],
  ["blogs", "Blog posts"],
  ["clients", "Client logos"],
  ["content", "Page content"],
  ["catalogContent", "Catalog content"],
  ["seo", "SEO & Ads"],
  ["inquiries", "Enquiries"],
  ["settings", "Settings"],
] as const;

function emptyClientLogo(): ClientLogoDraft {
  return {
    id: "",
    name: "",
    imageUrl: "",
    websiteUrl: "",
    market: "UAE",
    published: true,
    sortOrder: 100,
  };
}

function clientLogoToDraft(logo: ClientLogo): ClientLogoDraft {
  return {
    id: logo.id,
    name: logo.name,
    imageUrl: logo.imageUrl,
    websiteUrl: logo.websiteUrl,
    market: logo.market,
    published: logo.published,
    sortOrder: logo.sortOrder,
  };
}

function emptyProduct(categoryId = ""): ProductDraft {
  return {
    id: "",
    name: "",
    slug: "",
    sku: "",
    categoryId,
    summary: "",
    description: "",
    imageUrl: "",
    packSize: "",
    applications: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    robotsIndex: true,
    featured: false,
    eco: false,
    status: "published",
    sortOrder: 100,
  };
}

function emptyCategory(): CategoryDraft {
  return {
    id: "",
    name: "",
    slug: "",
    description: "",
    parentId: "",
    imageUrl: "",
    accent: "blue",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    robotsIndex: true,
    featured: false,
    sortOrder: 100,
  };
}

function productToDraft(product: Product, seoEntry?: SeoEntry): ProductDraft {
  return {
    ...product,
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
    packSize: product.packSize ?? "",
    applications: product.applications ?? "",
    metaTitle: seoEntry?.metaTitle ?? "",
    metaDescription: seoEntry?.metaDescription ?? "",
    keywords: seoEntry?.keywords ?? "",
    ogTitle: seoEntry?.ogTitle ?? "",
    ogDescription: seoEntry?.ogDescription ?? "",
    robotsIndex: seoEntry?.robotsIndex ?? true,
    status: product.status === "draft" ? "draft" : "published",
  };
}

function categoryToDraft(category: Category, seoEntry?: SeoEntry): CategoryDraft {
  return {
    ...category,
    parentId: category.parentId ?? "",
    metaTitle: seoEntry?.metaTitle ?? "",
    metaDescription: seoEntry?.metaDescription ?? "",
    keywords: seoEntry?.keywords ?? "",
    ogTitle: seoEntry?.ogTitle ?? "",
    ogDescription: seoEntry?.ogDescription ?? "",
    robotsIndex: seoEntry?.robotsIndex ?? true,
  };
}

const contactSettingKeys = new Set([
  "email",
  "phone",
  "whatsapp",
  "markets",
  "address",
  "catalog_claim",
  "social_facebook",
  "social_instagram",
  "social_linkedin",
  "social_x",
  "social_youtube",
]);

const seoSettingGroups = [
  {
    title: "SEO defaults",
    description:
      "Site identity, canonical domain, default search snippets and webmaster verification.",
    keys: [
      "site_name",
      "site_url",
      "default_meta_title",
      "default_meta_description",
      "default_keywords",
      "default_og_image",
      "robots_index",
      "google_site_verification",
      "bing_site_verification",
    ],
  },
  {
    title: "Organization schema",
    description:
      "Business identity used by search engines for structured knowledge signals.",
    keys: [
      "organization_name",
      "organization_legal_name",
      "organization_logo",
    ],
  },
  {
    title: "Analytics & advertising",
    description:
      "Add IDs only. Scripts are generated safely and enquiry actions are tracked automatically.",
    keys: [
      "gtm_id",
      "ga4_id",
      "google_ads_id",
      "google_ads_conversion_label",
      "meta_pixel_id",
    ],
  },
] as const;

export function AdminConsole({
  initialData,
  user,
}: {
  initialData: AdminData;
  user: { displayName: string; email: string };
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("overview");
  const [productDraft, setProductDraft] = useState<ProductDraft>(
    emptyProduct(initialData.categories[0]?.id),
  );
  const [categoryDraft, setCategoryDraft] =
    useState<CategoryDraft>(emptyCategory());
  const [clientLogoDraft, setClientLogoDraft] =
    useState<ClientLogoDraft>(emptyClientLogo());
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const categoryById = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category])),
    [data.categories],
  );
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return data.products;
    return data.products.filter((product) =>
      `${product.name} ${product.sku}`.toLowerCase().includes(query),
    );
  }, [data.products, productSearch]);
  const contentGroups = useMemo(() => {
    const groups = new Map<string, ContentBlock[]>();
    for (const block of data.contentBlocks) {
      groups.set(block.groupName, [...(groups.get(block.groupName) ?? []), block]);
    }
    return [...groups.entries()];
  }, [data.contentBlocks]);

  async function refresh() {
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    const result = (await response.json()) as AdminData & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to refresh the CMS");
    setData(result);
  }

  async function runAction(action: string, payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
      await refresh();
      setNotice("Saved. The public site now uses this content.");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to save changes.",
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
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "The image could not be uploaded.");
      }
      if (tab === "clients") {
        setClientLogoDraft((draft) => ({
          ...draft,
          imageUrl: result.url ?? "",
        }));
        setNotice("Client logo uploaded. Save it to publish the change.");
        return;
      }
      setProductDraft((draft) => ({ ...draft, imageUrl: result.url ?? "" }));
      setCategoryDraft((draft) =>
        tab === "categories"
          ? { ...draft, imageUrl: result.url ?? "" }
          : draft,
      );
      setNotice("Image uploaded. Save the item to publish it.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    await runAction("saveProduct", productDraft);
    setProductDraft(emptyProduct(data.categories[0]?.id));
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    await runAction("saveCategory", categoryDraft);
    setCategoryDraft(emptyCategory());
  }

  async function saveClientLogo(event: FormEvent) {
    event.preventDefault();
    await runAction("saveClientLogo", clientLogoDraft);
    setClientLogoDraft(emptyClientLogo());
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    await runAction("saveContent", { values });
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    await runAction("saveSettings", { values });
  }

  async function saveSeo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const settings: Record<string, string> = {};
    const entries: Record<string, Record<string, string | boolean>> = {};

    for (const [name, value] of formData.entries()) {
      if (name.startsWith("setting__")) {
        settings[name.slice("setting__".length)] = String(value);
        continue;
      }
      if (!name.startsWith("seo__")) continue;
      const [, entryKey, field] = name.split("__");
      if (!entryKey || !field) continue;
      entries[entryKey] ??= {};
      entries[entryKey][field] = String(value);
    }

    settings.robots_index = formData.has("setting__robots_index")
      ? "true"
      : "false";
    for (const entry of data.seoEntries.filter(
      (item) => item.entityType === "page",
    )) {
      entries[entry.key] ??= {};
      entries[entry.key].robotsIndex = formData.has(
        `seo__${entry.key}__robotsIndex`,
      );
    }

    await runAction("saveSeo", { settings, entries });
  }

  function openProduct(product: Product) {
    setProductDraft(
      productToDraft(
        product,
        data.seoEntries.find((entry) => entry.key === `product:${product.id}`),
      ),
    );
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCategory(category: Category) {
    setCategoryDraft(
      categoryToDraft(
        category,
        data.seoEntries.find((entry) => entry.key === `category:${category.id}`),
      ),
    );
    setTab("categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openClientLogo(logo: ClientLogo) {
    setClientLogoDraft(clientLogoToDraft(logo));
    setTab("clients");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <img src="/brand/dco-mark.png" alt="" width="46" height="46" />
          <span>
            Hygiene Links
            <small>Content manager</small>
          </span>
        </a>
        <nav aria-label="CMS sections">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "is-active" : ""}
              onClick={() => setTab(id)}
            >
              <span className="admin-nav-dot" />
              {label}
              {id === "inquiries" && data.inquiries.length > 0 && (
                <b>{data.inquiries.filter((item) => item.status === "new").length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <span>Signed in as</span>
          <strong>{user.displayName}</strong>
          <small>{user.email}</small>
          <a href="/">View public site ↗</a>
          <button className="admin-signout" onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>DIAMOND CAPITAL OASIS CMS</p>
            <h1>{tabs.find(([id]) => id === tab)?.[1]}</h1>
          </div>
          <div className="admin-topbar__status">
            <span />
            Published content
          </div>
        </header>

        {(notice || error) && (
          <div className={`admin-notice${error ? " admin-notice--error" : ""}`}>
            {error || notice}
            <button
              aria-label="Dismiss message"
              onClick={() => {
                setNotice("");
                setError("");
              }}
            >
              ×
            </button>
          </div>
        )}

        {tab === "overview" && (
          <section className="admin-section">
            <div className="admin-welcome">
              <div>
                <p className="eyebrow">GOOD TO SEE YOU</p>
                <h2>Your catalog is ready to manage.</h2>
                <p>
                  Products, category structure, public-page copy, contact details
                  and enquiries all live here.
                </p>
              </div>
              <a className="button button--primary" href="/" target="_blank">
                Open website ↗
              </a>
            </div>
            <div className="admin-stats">
              <article>
                <span>Products</span>
                <strong>{data.products.length}</strong>
                <small>
                  {data.products.filter((item) => item.status === "published").length}{" "}
                  published
                </small>
              </article>
              <article>
                <span>Categories</span>
                <strong>{data.categories.length}</strong>
                <small>
                  {data.categories.filter((item) => item.parentId).length}{" "}
                  subcategories
                </small>
              </article>
              <article>
                <span>Page fields</span>
                <strong>{data.contentBlocks.length}</strong>
                <small>Editable text blocks</small>
              </article>
              <article>
                <span>Blog posts</span>
                <strong>{data.blogs.length}</strong>
                <small>
                  {data.blogs.filter((item) => item.status === "published").length}{" "}
                  published
                </small>
              </article>
              <article>
                <span>Open enquiries</span>
                <strong>
                  {data.inquiries.filter((item) => item.status !== "closed").length}
                </strong>
                <small>Newest first</small>
              </article>
            </div>
            <div className="admin-two-column">
              <article className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="eyebrow">QUICK ACTIONS</p>
                    <h3>Keep the catalog fresh</h3>
                  </div>
                </div>
                <div className="quick-actions">
                  <button onClick={() => setTab("products")}>
                    <span>+</span>
                    Add a product
                  </button>
                  <button onClick={() => setTab("categories")}>
                    <span>+</span>
                    Add a category
                  </button>
                  <button onClick={() => setTab("blogs")}>
                    <span>+</span>
                    Add a blog post
                  </button>
                  <button onClick={() => setTab("content")}>
                    <span>↗</span>
                    Edit homepage
                  </button>
                </div>
              </article>
              <article className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="eyebrow">LATEST ENQUIRIES</p>
                    <h3>Recent interest</h3>
                  </div>
                  <button className="text-button" onClick={() => setTab("inquiries")}>
                    View all
                  </button>
                </div>
                {data.inquiries.length ? (
                  <div className="mini-enquiries">
                    {data.inquiries.slice(0, 4).map((item) => (
                      <div key={item.id}>
                        <span>{item.name.slice(0, 1).toUpperCase()}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.productName}</small>
                        </div>
                        <time>{item.status.replace("_", " ")}</time>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty">
                    Enquiries submitted on the public site will appear here.
                  </div>
                )}
              </article>
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="admin-section admin-editor-layout">
            <form className="admin-form-card" onSubmit={saveProduct}>
              <div className="admin-form-card__header">
                <div>
                  <p className="eyebrow">
                    {productDraft.id ? "EDIT PRODUCT" : "NEW PRODUCT"}
                  </p>
                  <h2>{productDraft.id ? productDraft.name : "Add to the catalog"}</h2>
                </div>
                {productDraft.id && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setProductDraft(emptyProduct(data.categories[0]?.id))
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="admin-field-grid">
                <label className="admin-field admin-field--wide">
                  <span>Product name *</span>
                  <input
                    required
                    value={productDraft.name}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, name: event.target.value })
                    }
                    placeholder="e.g. Floor & Bathroom Cleaner"
                  />
                </label>
                <label className="admin-field">
                  <span>SKU *</span>
                  <input
                    required
                    value={productDraft.sku}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, sku: event.target.value })
                    }
                    placeholder="HL-CC-001"
                  />
                </label>
                <label className="admin-field">
                  <span>URL slug</span>
                  <input
                    value={productDraft.slug}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, slug: event.target.value })
                    }
                    placeholder="Created from product name"
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Category *</span>
                  <select
                    required
                    value={productDraft.categoryId}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        categoryId: event.target.value,
                      })
                    }
                  >
                    <option value="">Select category</option>
                    {data.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parentId ? "— " : ""}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Short description</span>
                  <textarea
                    rows={2}
                    value={productDraft.summary}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        summary: event.target.value,
                      })
                    }
                    placeholder="One line for product cards"
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Full description</span>
                  <textarea
                    rows={5}
                    value={productDraft.description}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        description: event.target.value,
                      })
                    }
                    placeholder="Product details, benefits and application guidance"
                  />
                </label>
                <div className="admin-seo-fields admin-field--wide">
                  <div className="admin-subheading">
                    <span>Search appearance</span>
                    <small>
                      The canonical URL will be /product/
                      {productDraft.slug || "product-name"}.html
                    </small>
                  </div>
                  <div className="admin-field-grid">
                    <label className="admin-field admin-field--wide">
                      <span>Meta title</span>
                      <input
                        value={productDraft.metaTitle}
                        maxLength={160}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            metaTitle: event.target.value,
                          })
                        }
                        placeholder="Defaults to the product name"
                      />
                      <small>{productDraft.metaTitle.length}/60 recommended characters</small>
                    </label>
                    <label className="admin-field admin-field--wide">
                      <span>Meta description</span>
                      <textarea
                        rows={3}
                        value={productDraft.metaDescription}
                        maxLength={500}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            metaDescription: event.target.value,
                          })
                        }
                        placeholder="Defaults to the short product description"
                      />
                      <small>
                        {productDraft.metaDescription.length}/160 recommended characters
                      </small>
                    </label>
                    <label className="admin-field admin-field--wide">
                      <span>Target keywords</span>
                      <input
                        value={productDraft.keywords}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            keywords: event.target.value,
                          })
                        }
                        placeholder="Comma-separated editorial keywords"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Social title</span>
                      <input
                        value={productDraft.ogTitle}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            ogTitle: event.target.value,
                          })
                        }
                        placeholder="Optional Open Graph title"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Social description</span>
                      <input
                        value={productDraft.ogDescription}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            ogDescription: event.target.value,
                          })
                        }
                        placeholder="Optional sharing description"
                      />
                    </label>
                    <label className="admin-index-toggle admin-field--wide">
                      <input
                        type="checkbox"
                        checked={productDraft.robotsIndex}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            robotsIndex: event.target.checked,
                          })
                        }
                      />
                      <span>
                        Allow search engines to index this product
                        <small>Disable for temporary, duplicate or private products.</small>
                      </span>
                    </label>
                  </div>
                </div>
                <label className="admin-field">
                  <span>Pack size</span>
                  <input
                    value={productDraft.packSize}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        packSize: event.target.value,
                      })
                    }
                    placeholder="1 L · 5 L · 20 L"
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Product details / applications</span>
                  <textarea
                    value={productDraft.applications}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        applications: event.target.value,
                      })
                    }
                    placeholder="Brand: Hi Care&#10;Size: 5 L&#10;Applications: Hotels · Offices"
                    rows={5}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Product image</span>
                  <div className="admin-image-field">
                    <div className="admin-image-preview">
                      {productDraft.imageUrl ? (
                        <img src={productDraft.imageUrl} alt="" />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div>
                      <input
                        value={productDraft.imageUrl}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            imageUrl: event.target.value,
                          })
                        }
                        placeholder="/media/... or https://..."
                      />
                      <label className="upload-button">
                        {uploading ? "Uploading…" : "Upload JPEG, PNG or WebP"}
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
                <label className="admin-field">
                  <span>Visibility</span>
                  <select
                    value={productDraft.status}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        status: event.target.value as "draft" | "published",
                      })
                    }
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={productDraft.sortOrder}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="admin-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={productDraft.featured}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        featured: event.target.checked,
                      })
                    }
                  />
                  Feature on homepage
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={productDraft.eco}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        eco: event.target.checked,
                      })
                    }
                  />
                  Eco range badge
                </label>
              </div>
              <button className="button button--primary button--wide" disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </button>
            </form>

            <div className="admin-list-card">
              <div className="admin-list-card__header">
                <div>
                  <p className="eyebrow">CATALOG</p>
                  <h2>{data.products.length} products</h2>
                </div>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search name or SKU"
                  aria-label="Search products"
                />
              </div>
              <div className="admin-product-list">
                {filteredProducts.map((product) => (
                  <article key={product.id}>
                    <div className="admin-list-image">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" />
                      ) : (
                        <span>{product.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{product.name}</strong>
                      <span>
                        {product.sku} ·{" "}
                        {categoryById.get(product.categoryId)?.name ?? "Uncategorized"}
                      </span>
                    </div>
                    <span
                      className={`admin-status admin-status--${product.status}`}
                    >
                      {product.status}
                    </span>
                    <button className="table-action" onClick={() => openProduct(product)}>
                      Edit
                    </button>
                    <button
                      className="table-action table-action--danger"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Delete ${product.name}? This cannot be undone.`,
                          )
                        ) {
                          await runAction("deleteProduct", { id: product.id });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "categories" && (
          <section className="admin-section admin-editor-layout">
            <form className="admin-form-card" onSubmit={saveCategory}>
              <div className="admin-form-card__header">
                <div>
                  <p className="eyebrow">
                    {categoryDraft.id ? "EDIT CATEGORY" : "NEW CATEGORY"}
                  </p>
                  <h2>
                    {categoryDraft.id
                      ? categoryDraft.name
                      : "Organize the catalog"}
                  </h2>
                </div>
                {categoryDraft.id && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setCategoryDraft(emptyCategory())}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="admin-field-grid">
                <label className="admin-field admin-field--wide">
                  <span>Category name *</span>
                  <input
                    required
                    value={categoryDraft.name}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        name: event.target.value,
                      })
                    }
                    placeholder="e.g. Dispensers"
                  />
                </label>
                <label className="admin-field">
                  <span>Parent category</span>
                  <select
                    value={categoryDraft.parentId}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        parentId: event.target.value,
                      })
                    }
                  >
                    <option value="">Top-level category</option>
                    {data.categories
                      .filter(
                        (category) =>
                          !category.parentId && category.id !== categoryDraft.id,
                      )
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>URL slug</span>
                  <input
                    value={categoryDraft.slug}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        slug: event.target.value,
                      })
                    }
                    placeholder="Created from name"
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Category page content</span>
                  <textarea
                    rows={10}
                    value={categoryDraft.description}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        description: event.target.value,
                      })
                    }
                    placeholder="Add the category introduction and supporting content. Separate paragraphs with a blank line."
                  />
                  <small>
                    This content appears on the category’s dedicated .html page.
                  </small>
                </label>
                <div className="admin-seo-fields admin-field--wide">
                  <div className="admin-subheading">
                    <span>Search appearance</span>
                    <small>
                      The canonical URL will be {categoryUrl(
                        categoryDraft.slug || "category-name",
                      )}
                    </small>
                  </div>
                  <div className="admin-field-grid">
                    <label className="admin-field admin-field--wide">
                      <span>Meta title</span>
                      <input
                        value={categoryDraft.metaTitle}
                        maxLength={160}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            metaTitle: event.target.value,
                          })
                        }
                        placeholder="Defaults to the category name"
                      />
                      <small>{categoryDraft.metaTitle.length}/60 recommended characters</small>
                    </label>
                    <label className="admin-field admin-field--wide">
                      <span>Meta description</span>
                      <textarea
                        rows={3}
                        value={categoryDraft.metaDescription}
                        maxLength={500}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            metaDescription: event.target.value,
                          })
                        }
                        placeholder="Defaults to the category description"
                      />
                      <small>
                        {categoryDraft.metaDescription.length}/160 recommended characters
                      </small>
                    </label>
                    <label className="admin-field admin-field--wide">
                      <span>Target keywords</span>
                      <input
                        value={categoryDraft.keywords}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            keywords: event.target.value,
                          })
                        }
                        placeholder="Comma-separated editorial keywords"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Social title</span>
                      <input
                        value={categoryDraft.ogTitle}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            ogTitle: event.target.value,
                          })
                        }
                        placeholder="Optional Open Graph title"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Social description</span>
                      <input
                        value={categoryDraft.ogDescription}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            ogDescription: event.target.value,
                          })
                        }
                        placeholder="Optional sharing description"
                      />
                    </label>
                    <label className="admin-index-toggle admin-field--wide">
                      <input
                        type="checkbox"
                        checked={categoryDraft.robotsIndex}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            robotsIndex: event.target.checked,
                          })
                        }
                      />
                      <span>
                        Allow search engines to index this category
                        <small>Disable only for duplicate or temporary categories.</small>
                      </span>
                    </label>
                  </div>
                </div>
                <label className="admin-field admin-field--wide">
                  <span>Category image</span>
                  <div className="admin-image-field">
                    <div className="admin-image-preview">
                      {categoryDraft.imageUrl ? (
                        <img src={categoryDraft.imageUrl} alt="" />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div>
                      <input
                        value={categoryDraft.imageUrl}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            imageUrl: event.target.value,
                          })
                        }
                        placeholder="/media/... or https://..."
                      />
                      <label className="upload-button">
                        {uploading ? "Uploading…" : "Upload JPEG, PNG or WebP"}
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
                <label className="admin-field">
                  <span>Accent color</span>
                  <select
                    value={categoryDraft.accent}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        accent: event.target.value,
                      })
                    }
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="cyan">Cyan</option>
                    <option value="sky">Sky</option>
                    <option value="navy">Navy</option>
                    <option value="orange">Orange</option>
                    <option value="violet">Violet</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={categoryDraft.sortOrder}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="admin-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={categoryDraft.featured}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        featured: event.target.checked,
                      })
                    }
                  />
                  Feature on homepage
                </label>
              </div>
              <button className="button button--primary button--wide" disabled={saving}>
                {saving ? "Saving…" : "Save category"}
              </button>
            </form>

            <div className="admin-list-card">
              <div className="admin-list-card__header">
                <div>
                  <p className="eyebrow">TAXONOMY</p>
                  <h2>{data.categories.length} categories</h2>
                </div>
              </div>
              <div className="admin-category-list">
                {data.categories.map((category) => (
                  <article
                    key={category.id}
                    className={category.parentId ? "is-child" : ""}
                  >
                    <span
                      className={`category-swatch category-swatch--${category.accent}`}
                    />
                    <div>
                      <strong>{category.name}</strong>
                      <small>
                        {category.parentId
                          ? `Subcategory of ${
                              categoryById.get(category.parentId)?.name ?? "Unknown"
                            }`
                          : "Top-level category"}
                      </small>
                    </div>
                    <span>
                      {
                        data.products.filter(
                          (product) => product.categoryId === category.id,
                        ).length
                      }{" "}
                      products
                    </span>
                    <button
                      className="table-action"
                      onClick={() => openCategory(category)}
                    >
                      Edit
                    </button>
                    <button
                      className="table-action table-action--danger"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Delete ${category.name}? Empty it first.`,
                          )
                        ) {
                          await runAction("deleteCategory", { id: category.id });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "blogs" && (
          <BlogManager
            posts={data.blogs}
            seoEntries={data.seoEntries}
            onChanged={refresh}
          />
        )}

        {tab === "clients" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">CLIENT PORTFOLIO</p>
                <h2>Manage homepage client logos.</h2>
                <p>
                  Upload logos, set their market and display order, or keep an
                  entry unpublished until it is ready.
                </p>
              </div>
              <button
                className="button button--outline"
                type="button"
                onClick={() => setClientLogoDraft(emptyClientLogo())}
              >
                Add new logo
              </button>
            </div>

            <div className="client-logo-editor">
              <form className="admin-form-card" onSubmit={saveClientLogo}>
                <div className="admin-form-card__heading">
                  <div>
                    <p className="eyebrow">
                      {clientLogoDraft.id ? "EDIT CLIENT" : "NEW CLIENT"}
                    </p>
                    <h2>
                      {clientLogoDraft.id
                        ? clientLogoDraft.name
                        : "Add a client logo"}
                    </h2>
                  </div>
                </div>
                <div className="admin-field-grid">
                  <label className="admin-field">
                    <span>Client name</span>
                    <input
                      required
                      value={clientLogoDraft.name}
                      onChange={(event) =>
                        setClientLogoDraft({
                          ...clientLogoDraft,
                          name: event.target.value,
                        })
                      }
                      placeholder="Client or organization name"
                    />
                  </label>
                  <label className="admin-field">
                    <span>Market</span>
                    <select
                      value={clientLogoDraft.market}
                      onChange={(event) =>
                        setClientLogoDraft({
                          ...clientLogoDraft,
                          market: event.target.value,
                        })
                      }
                    >
                      <option value="UAE">UAE</option>
                      <option value="OMAN">Oman</option>
                      <option value="QATAR">Qatar</option>
                      <option value="REGIONAL">Regional</option>
                    </select>
                  </label>
                  <label className="admin-field admin-field--wide">
                    <span>Client website</span>
                    <input
                      type="url"
                      value={clientLogoDraft.websiteUrl}
                      onChange={(event) =>
                        setClientLogoDraft({
                          ...clientLogoDraft,
                          websiteUrl: event.target.value,
                        })
                      }
                      placeholder="https:// (optional)"
                    />
                  </label>
                  <label className="admin-field admin-field--wide">
                    <span>Logo image</span>
                    <div className="admin-image-field">
                      <div className="admin-image-preview admin-image-preview--logo">
                        {clientLogoDraft.imageUrl ? (
                          <img src={clientLogoDraft.imageUrl} alt="" />
                        ) : (
                          <span>No logo</span>
                        )}
                      </div>
                      <div>
                        <input
                          required
                          value={clientLogoDraft.imageUrl}
                          onChange={(event) =>
                            setClientLogoDraft({
                              ...clientLogoDraft,
                              imageUrl: event.target.value,
                            })
                          }
                          placeholder="/media/... or https://..."
                        />
                        <label className="upload-button">
                          {uploading ? "Uploading…" : "Upload client logo"}
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
                  <label className="admin-field">
                    <span>Display order</span>
                    <input
                      type="number"
                      value={clientLogoDraft.sortOrder}
                      onChange={(event) =>
                        setClientLogoDraft({
                          ...clientLogoDraft,
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="admin-index-toggle">
                    <input
                      type="checkbox"
                      checked={clientLogoDraft.published}
                      onChange={(event) =>
                        setClientLogoDraft({
                          ...clientLogoDraft,
                          published: event.target.checked,
                        })
                      }
                    />
                    <span>
                      Show on homepage
                      <small>Uncheck to keep this logo in the CMS only.</small>
                    </span>
                  </label>
                </div>
                <button
                  className="button button--primary button--wide"
                  disabled={saving || uploading}
                >
                  {saving ? "Saving…" : "Save client logo"}
                </button>
              </form>

              <div className="admin-list-card">
                <div className="admin-list-card__header">
                  <div>
                    <p className="eyebrow">PUBLISHED PORTFOLIO</p>
                    <h2>{data.clientLogos.length} client logos</h2>
                  </div>
                </div>
                <div className="admin-client-logo-list">
                  {data.clientLogos.map((logo) => (
                    <article key={logo.id}>
                      <div className="admin-client-logo-list__image">
                        <img src={logo.imageUrl} alt="" />
                      </div>
                      <div>
                        <strong>{logo.name}</strong>
                        <small>
                          {logo.market} · {logo.published ? "Published" : "Hidden"}
                        </small>
                      </div>
                      <span>{logo.sortOrder}</span>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => openClientLogo(logo)}
                      >
                        Edit
                      </button>
                      <button
                        className="table-action table-action--danger"
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete ${logo.name}?`)) {
                            await runAction("deleteClientLogo", { id: logo.id });
                            if (clientLogoDraft.id === logo.id) {
                              setClientLogoDraft(emptyClientLogo());
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "content" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">PAGE EDITOR</p>
                <h2>Edit every public section from one form.</h2>
                <p>
                  Fields are plain text by design, keeping the layout consistent
                  and preventing unsafe markup.
                </p>
              </div>
            </div>
            <form className="content-editor" onSubmit={saveContent}>
              {contentGroups.map(([group, blocks]) => (
                <fieldset key={group}>
                  <legend>{group}</legend>
                  <div className="admin-field-grid">
                    {blocks.map((block) => (
                      <label
                        key={block.key}
                        className={`admin-field${
                          block.inputType === "textarea"
                            ? " admin-field--wide"
                            : ""
                        }`}
                      >
                        <span>{block.label}</span>
                        {block.inputType === "textarea" ? (
                          <textarea
                            name={block.key}
                            defaultValue={block.value}
                            rows={3}
                          />
                        ) : (
                          <input name={block.key} defaultValue={block.value} />
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="content-editor__footer">
                <span>Changes appear on the site as soon as they are saved.</span>
                <button className="button button--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save all page content"}
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === "catalogContent" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">CATEGORY & PRODUCT COPY</p>
                <h2>Edit the detailed content below product sections.</h2>
                <p>
                  Choose a page, edit its ordered headings, paragraphs and bullet
                  items, then save. Text remains safely escaped on the public site.
                </p>
              </div>
            </div>
            <CatalogEditorialManager
              entries={data.catalogEditorials}
              saving={saving}
              onSave={(key, blocks) =>
                runAction("saveCatalogEditorial", { key, blocks })
              }
            />
          </section>
        )}

        {tab === "seo" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">SEARCH & CAMPAIGN CONTROL</p>
                <h2>SEO, analytics and advertising</h2>
                <p>
                  Manage canonical search snippets, indexing, structured business
                  details and marketing platform IDs without editing code.
                </p>
              </div>
              <a
                className="button button--outline"
                href="/sitemap.xml"
                target="_blank"
              >
                Open sitemap ↗
              </a>
            </div>

            <form className="seo-editor" onSubmit={saveSeo}>
              <div className="seo-editor__notice">
                <strong>Tracking safety</strong>
                <p>
                  Use Google Tag Manager or direct GA4/Ads IDs according to your
                  measurement plan. Configuring the same tag in both places can
                  duplicate events.
                </p>
              </div>

              {seoSettingGroups.map((group) => (
                <fieldset key={group.title}>
                  <legend>
                    <span>{group.title}</span>
                    <small>{group.description}</small>
                  </legend>
                  <div className="admin-field-grid">
                    {group.keys.map((key) => {
                      const setting = data.settings.find((item) => item.key === key);
                      if (!setting) return null;
                      if (key === "robots_index") {
                        return (
                          <label
                            className="admin-index-toggle admin-field--wide"
                            key={key}
                          >
                            <input
                              type="checkbox"
                              name={`setting__${key}`}
                              defaultChecked={setting.value !== "false"}
                              value="true"
                            />
                            <span>
                              {setting.label}
                              <small>
                                Keep enabled on the live domain. Disable only for
                                staging or maintenance.
                              </small>
                            </span>
                          </label>
                        );
                      }

                      const isLongField = [
                        "default_meta_description",
                        "default_keywords",
                      ].includes(key);
                      return (
                        <label
                          className={`admin-field${
                            isLongField ? " admin-field--wide" : ""
                          }`}
                          key={key}
                        >
                          <span>{setting.label}</span>
                          {isLongField ? (
                            <textarea
                              name={`setting__${key}`}
                              defaultValue={setting.value}
                              rows={3}
                            />
                          ) : (
                            <input
                              name={`setting__${key}`}
                              defaultValue={setting.value}
                              placeholder={
                                key === "gtm_id"
                                  ? "GTM-XXXXXXX"
                                  : key === "ga4_id"
                                    ? "G-XXXXXXXXXX"
                                    : key === "google_ads_id"
                                      ? "AW-XXXXXXXXX"
                                      : key === "meta_pixel_id"
                                        ? "Numeric pixel ID"
                                        : undefined
                              }
                            />
                          )}
                          {key === "site_url" && (
                            <small>
                              Use the final HTTPS domain, without a trailing slash.
                            </small>
                          )}
                          {key === "google_ads_conversion_label" && (
                            <small>
                              Enquiry submissions, email clicks and WhatsApp clicks
                              use this conversion action.
                            </small>
                          )}
                          {key === "default_keywords" && (
                            <small>
                              Editorial guidance only; Google does not use the old
                              meta-keywords field as a ranking signal.
                            </small>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              <fieldset>
                <legend>
                  <span>Page search appearance</span>
                  <small>
                    Unique titles and descriptions for the main public pages.
                  </small>
                </legend>
                <div className="seo-page-grid">
                  {data.seoEntries
                    .filter((entry) => entry.entityType === "page")
                    .map((entry) => (
                      <article key={entry.key} className="seo-page-card">
                        <div className="seo-page-card__heading">
                          <div>
                            <span>{entry.label}</span>
                            <small>{entry.canonicalPath}</small>
                          </div>
                          <label>
                            <input
                              type="checkbox"
                              name={`seo__${entry.key}__robotsIndex`}
                              defaultChecked={entry.robotsIndex}
                              value="true"
                            />
                            Index
                          </label>
                        </div>
                        <label className="admin-field">
                          <span>Meta title</span>
                          <input
                            name={`seo__${entry.key}__metaTitle`}
                            defaultValue={entry.metaTitle}
                            maxLength={160}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Meta description</span>
                          <textarea
                            name={`seo__${entry.key}__metaDescription`}
                            defaultValue={entry.metaDescription}
                            rows={3}
                            maxLength={500}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Target keywords</span>
                          <input
                            name={`seo__${entry.key}__keywords`}
                            defaultValue={entry.keywords}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Canonical path</span>
                          <input
                            name={`seo__${entry.key}__canonicalPath`}
                            defaultValue={entry.canonicalPath}
                          />
                        </label>
                        <div className="admin-field-grid">
                          <label className="admin-field">
                            <span>Social title</span>
                            <input
                              name={`seo__${entry.key}__ogTitle`}
                              defaultValue={entry.ogTitle}
                            />
                          </label>
                          <label className="admin-field">
                            <span>Social description</span>
                            <input
                              name={`seo__${entry.key}__ogDescription`}
                              defaultValue={entry.ogDescription}
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                </div>
              </fieldset>

              <div className="content-editor__footer">
                <span>
                  Metadata and tracking updates apply immediately after saving.
                </span>
                <button className="button button--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save SEO & tracking"}
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === "inquiries" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">CUSTOMER INTEREST</p>
                <h2>Website enquiries</h2>
                <p>
                  Messages submitted through the site are stored here. Direct
                  email and WhatsApp actions still open the customer’s preferred
                  channel.
                </p>
              </div>
            </div>
            <div className="inquiry-table">
              {data.inquiries.length ? (
                data.inquiries.map((item) => (
                  <article key={item.id}>
                    <div className="inquiry-person">
                      <span>{item.name.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <a href={`mailto:${item.email}`}>{item.email}</a>
                        {item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}
                      </div>
                    </div>
                    <div>
                      <strong>{item.productName}</strong>
                      <small>
                        {item.company || "No company"} · {item.market}
                      </small>
                    </div>
                    <p>{item.message}</p>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </time>
                    <select
                      aria-label={`Status for enquiry from ${item.name}`}
                      value={item.status}
                      onChange={async (event) =>
                        runAction("updateInquiry", {
                          id: item.id,
                          status: event.target.value,
                        })
                      }
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </article>
                ))
              ) : (
                <div className="admin-empty admin-empty--large">
                  <span>✦</span>
                  <h3>No enquiries yet</h3>
                  <p>
                    New messages from the public enquiry form will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">SITE-WIDE DETAILS</p>
                <h2>Contact, brand and social settings</h2>
                <p>
                  These values power the header, footer and every product enquiry
                  action. SEO and campaign settings have their own dedicated tab.
                </p>
              </div>
            </div>
            <form className="settings-editor" onSubmit={saveSettings}>
              <div className="admin-field-grid">
                {data.settings
                  .filter((setting) => contactSettingKeys.has(setting.key))
                  .map((setting) => (
                    <label className="admin-field" key={setting.key}>
                      <span>{setting.label}</span>
                      <input
                        name={setting.key}
                        defaultValue={setting.value}
                        type={setting.key.startsWith("social_") ? "url" : "text"}
                        placeholder={
                          setting.key.startsWith("social_")
                            ? "https://"
                            : undefined
                        }
                      />
                      {setting.key === "whatsapp" && (
                        <small>Numbers only, including country code.</small>
                      )}
                      {setting.key.startsWith("social_") && (
                        <small>Leave blank to hide this icon from the footer.</small>
                      )}
                    </label>
                  ))}
              </div>
              <div className="settings-security">
                <div>
                  <span>CMS access</span>
                  <strong>Protected by secure cPanel login</strong>
                </div>
                <p>
                  The administrator email, password hash and signed session secret
                  are controlled through the cPanel Node.js environment.
                </p>
              </div>
              <button className="button button--primary" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
