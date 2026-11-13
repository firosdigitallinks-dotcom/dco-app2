import type { Category } from "../db/site";
import { categoryUrl } from "../lib/category-url";

type CategorySidebarProps = {
  categories: Category[];
  activeCategorySlug?: string;
};

export function CategorySidebar({
  categories,
  activeCategorySlug,
}: CategorySidebarProps) {
  const topCategories = categories.filter((category) => !category.parentId);

  return (
    <aside className="catalog-sidebar" aria-label="Product category navigation">
      <div className="catalog-sidebar__heading">
        <span>Browse by range</span>
        <a href="/catalog.html">View all</a>
      </div>
      <nav aria-label="Catalog categories">
        <a className={!activeCategorySlug ? "is-active" : ""} href="/catalog.html">
          <span>All products</span>
        </a>
        {topCategories.map((category) => {
          const children = categories.filter(
            (item) => item.parentId === category.id,
          );
          const activeChild = children.some(
            (child) => child.slug === activeCategorySlug,
          );
          const isActive =
            activeCategorySlug === category.slug || activeChild;

          if (!children.length) {
            return (
              <a
                key={category.id}
                className={isActive ? "is-active" : ""}
                href={categoryUrl(category.slug)}
              >
                <span>{category.name}</span>
              </a>
            );
          }

          return (
            <div
              key={category.id}
              className={`catalog-category-group${isActive ? " is-active" : ""}`}
            >
              <a
                className={isActive ? "is-active" : ""}
                href={categoryUrl(category.slug)}
                aria-haspopup="true"
              >
                <span>{category.name}</span>
              </a>
              <div
                className={`catalog-subcategories${
                  children.length > 8 ? " catalog-subcategories--wide" : ""
                }`}
                aria-label={`${category.name} subcategories`}
              >
                <div className="catalog-subcategories__head">
                  <span>Explore subcategories</span>
                  <strong>{category.name}</strong>
                </div>
                <div className="catalog-subcategories__links">
                  {children.map((child) => (
                    <a
                      key={child.id}
                      className={
                        activeCategorySlug === child.slug ? "is-active" : ""
                      }
                      href={categoryUrl(child.slug)}
                    >
                      <span>{child.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="catalog-help">
        <span>Can’t find an item?</span>
        <strong>We source specialist products too.</strong>
        <a href="/contact.html">Ask our team ↗</a>
      </div>
    </aside>
  );
}
