import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "div",
  "section",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "small",
  "sub",
  "sup",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "hr",
  "span",
  "iframe",
] as const;

/**
 * Sanitize CMS/imported article markup before it reaches storage or rendering.
 * Formatting tags are retained, while scripts, event handlers, inline styles,
 * data URLs, protocol-relative URLs, and untrusted iframe hosts are removed.
 */
export function sanitizeBlogHtml(value: unknown) {
  const input = typeof value === "string" ? value : "";

  const sanitized = sanitizeHtml(input, {
    allowedTags: [...allowedTags],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: ["src", "title", "width", "height", "loading", "allowfullscreen"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto", "tel"],
      img: ["http", "https"],
      iframe: ["https"],
    },
    allowedIframeHostnames: [
      "youtube.com",
      "www.youtube.com",
      "www.youtube-nocookie.com",
    ],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    disallowedTagsMode: "discard",
    exclusiveFilter: (frame) =>
      ["p", "h2", "h3", "h4", "h5", "h6"].includes(frame.tag) &&
      frame.mediaChildren.length === 0 &&
      frame.text.replace(/(?:&nbsp;|\u00a0|\s)/gi, "") === "",
    transformTags: {
      a: (_tagName, attributes) => {
        const target = attributes.target === "_blank" ? "_blank" : undefined;
        const safeAttributes = { ...attributes };
        delete safeAttributes.target;
        delete safeAttributes.rel;
        return {
          tagName: "a",
          attribs: {
            ...safeAttributes,
            ...(target ? { target, rel: "noopener noreferrer" } : {}),
          },
        };
      },
      img: (_tagName, attributes) => ({
        tagName: "img",
        attribs: {
          ...attributes,
          loading: attributes.loading === "eager" ? "eager" : "lazy",
        },
      }),
      iframe: (_tagName, attributes) => ({
        tagName: "iframe",
        attribs: {
          ...attributes,
          loading: "lazy",
          title: attributes.title || "Embedded video",
        },
      }),
    },
  }).trim();

  // The legacy editor inserted many paragraphs and headings containing only a
  // non-breaking space. They carry no written content and create large visual
  // gaps in migrated articles, so remove those empty formatting artifacts.
  return sanitized
    .replace(
      /<(p|h[2-6])>(?:\s|&nbsp;|\u00a0|<br\s*\/?>)*<\/\1>/giu,
      "",
    )
    .trim();
}

export function sanitizeBlogText(value: unknown, maxLength = 1_000) {
  const input = typeof value === "string" ? value : "";
  const plainText = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  return plainText.slice(0, Math.max(0, maxLength));
}

export function sanitizeBlogAssetUrl(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return "";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate.slice(0, 1_000);
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString().slice(0, 1_000)
      : "";
  } catch {
    return "";
  }
}

export function normalizeBlogSlug(value: unknown) {
  const input = typeof value === "string" ? value : "";
  return input
    .trim()
    .replace(/^.*\//, "")
    .replace(/\.html$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

export function legacyBlogPath(slug: unknown) {
  const normalized = normalizeBlogSlug(slug);
  return normalized ? `/blog/details/${normalized}.html` : "/blog.html";
}
