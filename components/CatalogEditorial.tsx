import type {
  CatalogEditorialBlock,
  CatalogEditorialPage,
} from "../lib/catalog-editorial";

function renderBlocks(blocks: CatalogEditorialBlock[]) {
  const rendered = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.type === "list-item") {
      const items = [];
      let listIndex = index;
      while (blocks[listIndex]?.type === "list-item") {
        const item = blocks[listIndex] as Extract<
          CatalogEditorialBlock,
          { type: "list-item" }
        >;
        items.push(<li key={`${listIndex}-${item.text}`}>{item.text}</li>);
        listIndex += 1;
      }
      rendered.push(<ul key={`list-${index}`}>{items}</ul>);
      index = listIndex - 1;
      continue;
    }

    if (block.type === "heading") {
      if (block.level === 2) {
        rendered.push(<h2 key={`${index}-${block.text}`}>{block.text}</h2>);
      } else {
        rendered.push(<h3 key={`${index}-${block.text}`}>{block.text}</h3>);
      }
      continue;
    }

    const labelledParagraph = block.text.match(
      /^([\s\S]{2,50}?)(\s*-\s*)([\s\S]+)$/,
    );
    if (labelledParagraph) {
      rendered.push(
        <p
          className="catalog-copy__labelled"
          key={`${index}-${block.text}`}
        >
          <strong>
            {labelledParagraph[1]}
            {labelledParagraph[2]}
          </strong>
          <span>{labelledParagraph[3]}</span>
        </p>,
      );
      continue;
    }

    const followsOpeningHeading =
      index === 1 && blocks[0]?.type === "heading";
    rendered.push(
      <p
        className={followsOpeningHeading ? "catalog-copy__lead" : undefined}
        key={`${index}-${block.text}`}
      >
        {block.text}
      </p>,
    );
  }

  return rendered;
}

export function CatalogEditorial({
  page,
  pageTitle,
}: {
  page: CatalogEditorialPage;
  pageTitle: string;
}) {
  return (
    <section
      className="catalog-copy"
      aria-label={`Detailed information about ${pageTitle}`}
    >
      <div className="shell">
        <article className="catalog-copy__article">
          {renderBlocks(page.blocks)}
        </article>
      </div>
    </section>
  );
}
