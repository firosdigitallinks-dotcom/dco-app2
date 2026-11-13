import contentData from "../data/missing-page-content.json";

export type CatalogEditorialBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list-item"; text: string };

export type CatalogEditorialPage = {
  type: "category" | "product";
  slug: string;
  sourceParagraphs?: [number, number];
  blocks: CatalogEditorialBlock[];
};

type CatalogEditorialRecord = {
  key: string;
  pageType: string;
  slug: string;
  blocksJson: string;
};

const pages = contentData.pages as CatalogEditorialPage[];
const pageIndex = new Map<string, CatalogEditorialPage>(
  pages.map((page) => [`${page.type}:${page.slug}`, page] as const),
);

export function getCatalogEditorial(
  type: CatalogEditorialPage["type"],
  slug: string,
  records?: CatalogEditorialRecord[],
) {
  const key = `${type}:${slug}`;
  const record = records?.find((item) => item.key === key);
  if (record) {
    const blocks = parseCatalogEditorialBlocks(record.blocksJson);
    if (blocks) return { type, slug, blocks } satisfies CatalogEditorialPage;
  }
  return pageIndex.get(key);
}

export function getCatalogEditorialPages() {
  return pages;
}

export function parseCatalogEditorialBlocks(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const blocks: CatalogEditorialBlock[] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") return null;
      const block = candidate as Record<string, unknown>;
      if (typeof block.text !== "string") return null;
      if (block.type === "paragraph" || block.type === "list-item") {
        blocks.push({ type: block.type, text: block.text });
        continue;
      }
      if (
        block.type === "heading" &&
        (block.level === 2 || block.level === 3)
      ) {
        blocks.push({ type: "heading", level: block.level, text: block.text });
        continue;
      }
      return null;
    }
    return blocks;
  } catch {
    return null;
  }
}
