import legacySeoMapping from "../data/legacy-seo-mapping.json";

const categoryCanonicalPaths = legacySeoMapping.categoryCanonicalPaths as Record<
  string,
  string
>;

export function categoryUrl(slug: string) {
  return categoryCanonicalPaths[slug] || `/category/${slug}.html`;
}
