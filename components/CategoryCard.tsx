import type { Category } from "../db/site";
import { categoryUrl } from "../lib/category-url";

export function CategoryCard({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  const code = `${index + 1}`.padStart(2, "0");
  return (
    <a
      className={`category-card category-card--${category.accent}`}
      href={categoryUrl(category.slug)}
    >
      <div className="category-card__top">
        <span>{code}</span>
        <span>Product range</span>
      </div>
      <div className="category-card__visual">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            width="260"
            height="220"
            loading="lazy"
          />
        ) : (
          <span className="category-card__monogram">
            {category.name
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </span>
        )}
      </div>
      <div className="category-card__body">
        <h3>{category.name}</h3>
        <p>{category.description}</p>
        <span className="category-card__button">View more <b>↗</b></span>
      </div>
    </a>
  );
}
