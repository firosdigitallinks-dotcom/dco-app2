#!/usr/bin/env python3
"""Extract approved catalog copy from the supplied Word document.

The paragraph ranges below deliberately exclude the document's editorial
markers and source/destination URLs. Text is copied verbatim; only Word's
visual bullet prefix is separated from the list item text for HTML rendering.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from docx import Document


PAGE_RANGES = [
    ("category", "tts-products", 8, 9),
    ("category", "dust-mops", 15, 47),
    ("category", "glass-clothes", 55, 172),
    ("category", "window-washers", 178, 243),
    ("category", "cotton-mops", 249, 272),
    ("category", "tissue-products", 279, 283),
    ("product", "toilet-roll", 289, 303),
    ("category", "plastic-jerry-cans", 311, 316),
    ("category", "dispensers", 323, 328),
    ("category", "tissue-dispensers", 336, 360),
    ("category", "feather-duster", 371, 416),
    ("category", "aerosol-products", 423, 428),
    ("category", "air-fresheners", 436, 454),
    ("product", "furniture-polish", 462, 476),
    ("category", "insect-killer", 491, 552),
    ("product", "baygon", 558, 564),
    ("category", "waste-management-products", 568, 583),
    ("category", "garbage-bins", 589, 668),
    ("product", "feminine-sanitary-bins", 672, 698),
    ("category", "waste-bin", 705, 721),
    ("category", "plastic-bags", 730, 741),
    ("category", "mop-buckets-trolley", 751, 757),
    ("category", "detergent-disinfectants", 764, 765),
    ("category", "hand-sanitizer", 770, 784),
    ("category", "car-care-products", 789, 834),
    ("category", "washroom-products", 839, 868),
    ("category", "cleaning-chemicals", 873, 962),
    ("category", "multi-purpose-detergents", 967, 1008),
    ("category", "dish-wash", 1013, 1039),
    ("category", "cleaning-towels", 1043, 1053),
    ("category", "other-products", 1058, 1134),
    ("category", "swimming-pool-cleaning-chemicals", 1139, 1185),
    ("category", "green-organic-products", 1190, 1245),
]

BULLET_PREFIX = re.compile(r"^[\u00b7\u2022\u25cf?]\s*")
BANNED_EXACT = {"missing content", "content missing", "fix structure", "this page is missing"}


def is_list_paragraph(paragraph) -> bool:
    return bool(paragraph._p.xpath("./w:pPr/w:numPr")) or bool(
        BULLET_PREFIX.match(paragraph.text)
    )


def is_direct_bold_heading(paragraph) -> bool:
    visible_runs = [run for run in paragraph.runs if run.text.strip()]
    return (
        paragraph.style.name == "Normal"
        and 0 < len(paragraph.text.strip()) <= 180
        and bool(visible_runs)
        and all(run.bold is True for run in visible_runs)
    )


def paragraph_block(paragraph) -> dict[str, object]:
    text = paragraph.text.strip()
    style = paragraph.style.name

    if style == "Heading 1":
        return {"type": "heading", "level": 2, "text": text}
    if style in {"Heading 2", "Heading 3", "Heading 4"} or is_direct_bold_heading(paragraph):
        return {"type": "heading", "level": 3, "text": text}
    if is_list_paragraph(paragraph):
        return {"type": "list-item", "text": BULLET_PREFIX.sub("", text, count=1)}
    return {"type": "paragraph", "text": text}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract-missing-page-content.py SOURCE.docx OUTPUT.json")

    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    document = Document(source)
    pages = []

    for page_type, slug, start, end in PAGE_RANGES:
        blocks = []
        for index in range(start, end + 1):
            paragraph = document.paragraphs[index]
            text = paragraph.text.strip()
            if not text:
                continue
            lowered = text.lower()
            if lowered in BANNED_EXACT or text.startswith(("http://", "https://")):
                raise ValueError(f"Editorial instruction leaked into {slug} at paragraph {index}: {text}")
            blocks.append(paragraph_block(paragraph))

        if not blocks:
            raise ValueError(f"No content extracted for {slug}")

        pages.append(
            {
                "type": page_type,
                "slug": slug,
                "sourceParagraphs": [start, end],
                "blocks": blocks,
            }
        )

    payload = {
        "source": source.name,
        "note": "Text copied verbatim from the supplied Word document; editorial markers and source URLs excluded.",
        "pages": pages,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    block_count = sum(len(page["blocks"]) for page in pages)
    character_count = sum(
        len(block["text"]) for page in pages for block in page["blocks"]
    )
    print(f"Wrote {len(pages)} pages, {block_count} blocks, {character_count} characters to {output}")


if __name__ == "__main__":
    main()
