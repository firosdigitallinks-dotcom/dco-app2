"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CatalogEditorial } from "../db/site";
import type { CatalogEditorialBlock } from "../lib/catalog-editorial";

type BlockChoice = "heading-2" | "heading-3" | "paragraph" | "list-item";

function parseBlocks(value: string) {
  try {
    const parsed = JSON.parse(value) as CatalogEditorialBlock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function blockChoice(block: CatalogEditorialBlock): BlockChoice {
  return block.type === "heading" ? `heading-${block.level}` : block.type;
}

function changeBlockType(
  block: CatalogEditorialBlock,
  choice: BlockChoice,
): CatalogEditorialBlock {
  if (choice === "heading-2") {
    return { type: "heading", level: 2, text: block.text };
  }
  if (choice === "heading-3") {
    return { type: "heading", level: 3, text: block.text };
  }
  return { type: choice, text: block.text };
}

export function CatalogEditorialManager({
  entries,
  saving,
  onSave,
}: {
  entries: CatalogEditorial[];
  saving: boolean;
  onSave: (key: string, blocks: CatalogEditorialBlock[]) => Promise<void>;
}) {
  const orderedEntries = useMemo(
    () => [...entries].sort((a, b) => a.sortOrder - b.sortOrder),
    [entries],
  );
  const [selectedKey, setSelectedKey] = useState(orderedEntries[0]?.key ?? "");
  const [blocks, setBlocks] = useState<CatalogEditorialBlock[]>([]);
  const selectedEntry = orderedEntries.find((entry) => entry.key === selectedKey);

  useEffect(() => {
    const entry = orderedEntries.find((item) => item.key === selectedKey);
    setBlocks(entry ? parseBlocks(entry.blocksJson) : []);
  }, [orderedEntries, selectedKey]);

  function updateBlock(index: number, block: CatalogEditorialBlock) {
    setBlocks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? block : item)),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    setBlocks((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function addBlock(choice: BlockChoice) {
    const block = changeBlockType({ type: "paragraph", text: "" }, choice);
    setBlocks((current) => [...current, block]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedEntry) return;
    await onSave(selectedEntry.key, blocks);
  }

  if (!orderedEntries.length) {
    return (
      <div className="admin-empty admin-empty--large">
        <span>✦</span>
        <h3>No catalog content pages are available.</h3>
      </div>
    );
  }

  const publicUrl = `/${selectedEntry?.pageType}/${selectedEntry?.slug}.html`;

  return (
    <form className="catalog-content-manager" onSubmit={submit}>
      <div className="catalog-content-manager__toolbar">
        <label className="admin-field">
          <span>Choose category or product page</span>
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
          >
            {orderedEntries.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.pageType === "category" ? "Category" : "Product"}: {entry.label}
              </option>
            ))}
          </select>
        </label>
        <div className="catalog-content-manager__summary">
          <span>{blocks.length} content blocks</span>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            View public page ↗
          </a>
        </div>
      </div>

      <div className="catalog-content-blocks">
        {blocks.map((block, index) => (
          <article className="catalog-content-block" key={`${selectedKey}-${index}`}>
            <div className="catalog-content-block__number">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="catalog-content-block__fields">
              <label className="admin-field">
                <span>Block type</span>
                <select
                  value={blockChoice(block)}
                  onChange={(event) =>
                    updateBlock(
                      index,
                      changeBlockType(block, event.target.value as BlockChoice),
                    )
                  }
                >
                  <option value="heading-2">Main section heading</option>
                  <option value="heading-3">Subheading</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="list-item">Bullet item</option>
                </select>
              </label>
              <label className="admin-field catalog-content-block__text">
                <span>Content</span>
                <textarea
                  rows={block.type === "paragraph" ? 5 : 2}
                  value={block.text}
                  onChange={(event) =>
                    updateBlock(index, { ...block, text: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="catalog-content-block__actions">
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Move block ${index + 1} up`}
                onClick={() => moveBlock(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === blocks.length - 1}
                aria-label={`Move block ${index + 1} down`}
                onClick={() => moveBlock(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="is-danger"
                aria-label={`Remove block ${index + 1}`}
                onClick={() =>
                  setBlocks((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="catalog-content-manager__add">
        <span>Add another block</span>
        <div>
          <button type="button" onClick={() => addBlock("heading-2")}>
            + Main heading
          </button>
          <button type="button" onClick={() => addBlock("heading-3")}>
            + Subheading
          </button>
          <button type="button" onClick={() => addBlock("paragraph")}>
            + Paragraph
          </button>
          <button type="button" onClick={() => addBlock("list-item")}>
            + Bullet item
          </button>
        </div>
      </div>

      <div className="content-editor__footer">
        <span>
          Saving updates this page immediately. Empty blocks are removed automatically.
        </span>
        <button className="button button--primary" disabled={saving}>
          {saving ? "Saving…" : "Save catalog page content"}
        </button>
      </div>
    </form>
  );
}
