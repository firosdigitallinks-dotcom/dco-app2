#!/usr/bin/env python3
"""Import the public Hygiene Links catalog into a normalized JSON bundle."""

from __future__ import annotations

import concurrent.futures
import hashlib
import html as html_lib
import json
import mimetypes
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "tmp/current-site/sitemap.xml"
SITEMAP_URL = "https://www.hygienelinks.com/sitemap.xml"
CATEGORY_INDEX_URL = "https://www.hygienelinks.com/allcategorylist.html"
OUTPUT = ROOT / "data/imported-catalog.json"
IMAGE_DIR = ROOT / "public/imported-products"
USER_AGENT = "HygieneLinksCatalogImporter/1.0 (+https://www.hygienelinks.com/)"
COUNTRY_RE = re.compile(r"\b(?:uae|oman|qatar|dubai|muscat)\b", re.I)
SPACE_RE = re.compile(r"\s+")
NON_SLUG_RE = re.compile(r"[^a-z0-9]+")


def tidy(value: str | None) -> str:
    return SPACE_RE.sub(" ", html_lib.unescape(value or "")).strip()


def slugify(value: str) -> str:
    slug = NON_SLUG_RE.sub("-", tidy(value).lower()).strip("-")
    return slug or "item"


def normalize_name(value: str) -> str:
    value = re.sub(r"\((?:uae|oman|qatar|dubai|muscat)\)", " ", value, flags=re.I)
    value = COUNTRY_RE.sub(" ", value)
    return NON_SLUG_RE.sub(" ", value.lower()).strip()


def canonical_url(value: str) -> str:
    parsed = urllib.parse.urlsplit(value.strip())
    path = re.sub(r"/{2,}", "/", parsed.path)
    return urllib.parse.urlunsplit(("https", "www.hygienelinks.com", path, "", ""))


def fetch(url: str, attempts: int = 3) -> tuple[str, bytes, str]:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                content_type = response.headers.get_content_type()
                return response.geturl(), body, content_type
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            last_error = error
            time.sleep(0.7 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def parse_document(body: bytes):
    return html.fromstring(body.decode("utf-8", errors="replace"))


def extract_urls() -> list[str]:
    _, sitemap_body, _ = fetch(SITEMAP_URL)
    SITEMAP.parent.mkdir(parents=True, exist_ok=True)
    SITEMAP.write_bytes(sitemap_body)
    raw = SITEMAP.read_text(encoding="utf-8-sig")
    return sorted({canonical_url(url) for url in re.findall(r"<loc>(.*?)</loc>", raw)})


def page_text(node) -> str:
    blocks: list[str] = []
    for element in node.xpath(".//p|.//div|.//li|.//h2|.//h3"):
        if element.xpath("ancestor::*[contains(@class, 'productbox')]"):
            continue
        text = tidy(" ".join(element.itertext()))
        if text and (not blocks or text != blocks[-1]):
            blocks.append(text)
    return "\n\n".join(blocks)


def extract_sidebar_mapping(
    doc,
) -> tuple[dict[str, str], dict[str, dict], dict[str, dict], dict[str, str]]:
    subcategory_to_parent: dict[str, str] = {}
    parents: dict[str, dict] = {}
    subcategories: dict[str, dict] = {}
    parent_source_to_slug: dict[str, str] = {}
    for item in doc.xpath("//div[@id='nav_left']/ul/li"):
        anchors = item.xpath("./a[1]")
        if not anchors:
            continue
        name = tidy(" ".join(anchors[0].itertext()))
        href = anchors[0].get("href") or ""
        if not name:
            continue
        normalized_parent = tidy(COUNTRY_RE.sub("", name)) or name
        parent_slug = slugify(normalized_parent)
        parents[parent_slug] = {
            "name": normalized_parent,
            "sourceUrl": canonical_url(href) if href else "",
        }
        if href:
            parent_source_to_slug[canonical_url(href)] = parent_slug
        for anchor in item.xpath("./ul/li/a"):
            child_href = anchor.get("href") or ""
            if child_href:
                child_url = canonical_url(child_href)
                child_name = tidy(" ".join(anchor.itertext()))
                subcategory_to_parent[child_url] = parent_slug
                subcategories[child_url] = {
                    "name": child_name,
                    "parentSlug": parent_slug,
                    "sourceUrl": child_url,
                }
    return subcategory_to_parent, parents, subcategories, parent_source_to_slug


def extract_listing(url: str, body: bytes) -> dict:
    doc = parse_document(body)
    containers = doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' product_contant ')]")
    container = containers[0] if containers else doc
    headings = container.xpath("./h1|.//h1")
    raw_name = tidy(" ".join(headings[0].itertext())) if headings else ""
    name = tidy(COUNTRY_RE.sub("", raw_name)) or raw_name or slugify(url.rsplit("/", 1)[-1])

    description_parts: list[str] = []
    if headings:
        sibling = headings[0].getnext()
        while sibling is not None:
            classes = f" {sibling.get('class') or ''} "
            if " productbox " in classes:
                break
            text = tidy(" ".join(sibling.itertext()))
            if text and sibling.tag.lower() != "hr":
                description_parts.append(text)
            sibling = sibling.getnext()

    products: list[dict] = []
    for card in doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' productlisting_box ')]"):
        card_links = card.xpath(".//a/@href")
        detail_links = [
            href
            for href in card_links
            if "-details" in href and "product-enquiry-" not in href
        ]
        image_values = card.xpath(".//img/@src")
        alt_values = card.xpath(".//img/@alt")
        enquiry_values = [
            href for href in card_links if "product-enquiry-" in href
        ]
        navigation_values = [
            href
            for href in card_links
            if "/products/" in href or "/category/" in href
        ]
        if navigation_values and not detail_links and not enquiry_values:
            continue
        paragraphs = card.xpath("./p[not(contains(@class, 'produ_img'))]")
        product_name = tidy(" ".join(paragraphs[0].itertext())) if paragraphs else ""
        if not product_name and alt_values:
            product_name = tidy(alt_values[0])
        if not product_name:
            continue
        enquiry_match = re.search(r"product-enquiry-(\d+)", enquiry_values[0]) if enquiry_values else None
        products.append(
            {
                "url": canonical_url(detail_links[0]) if detail_links else "",
                "name": product_name,
                "imageUrl": canonical_url(image_values[0]) if image_values else "",
                "sourceEnquiryId": enquiry_match.group(1) if enquiry_match else "",
            }
        )

    return {
        "sourceUrl": url,
        "name": name,
        "description": "\n\n".join(description_parts),
        "products": products,
    }


def extract_product(url: str, body: bytes) -> dict | None:
    doc = parse_document(body)
    headings = doc.xpath("//h1[contains(concat(' ', normalize-space(@class), ' '), ' pro ')]")
    if not headings:
        return None
    name = tidy(" ".join(headings[0].itertext()))
    if not name:
        return None

    images = doc.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' prodet_box ')]"
        "//a[contains(concat(' ', normalize-space(@class), ' '), ' jqzoom ')]/@href"
    )
    if not images:
        images = doc.xpath(
            "//div[contains(concat(' ', normalize-space(@class), ' '), ' prodet_box ')]//img/@src"
        )

    descriptions = doc.xpath(
        "//meta[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='description']/@content"
    )
    meta_description = next((tidy(value) for value in descriptions if tidy(value)), "")

    specs: list[tuple[str, str]] = []
    boxes = doc.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' productdetails_box ')]"
    )
    if boxes:
        for row in boxes[0].xpath(".//table//tr"):
            cells = [tidy(" ".join(cell.itertext())) for cell in row.xpath("./th|./td")]
            cells = [cell for cell in cells if cell and cell != ":"]
            if len(cells) >= 2:
                specs.append((cells[0].rstrip(":"), cells[-1]))

    detail_text = ""
    detail_headings = doc.xpath(
        "//h2[translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='details']"
    )
    if detail_headings:
        sibling = detail_headings[0].getnext()
        if sibling is not None:
            detail_text = tidy(" ".join(sibling.itertext()))

    pdf_links = doc.xpath("//div[contains(@class, 'productdetails_box')]//a[contains(@href, '.pdf')]/@href")
    enquiry_links = doc.xpath("//a[contains(@href, 'product-enquiry-')]/@href")
    enquiry_match = re.search(r"product-enquiry-(\d+)", enquiry_links[0]) if enquiry_links else None

    spec_map = {key.lower(): value for key, value in specs}
    code = spec_map.get("code") or spec_map.get("product code") or ""
    packing_values = []
    for label in ("packing", "packaging", "size"):
        if spec_map.get(label):
            packing_values.append(f"{label.title()}: {spec_map[label]}")
    remaining_specs = [
        f"{key}: {value}"
        for key, value in specs
        if key.lower() not in {"code", "product code", "packing", "packaging", "size"}
    ]
    document_url = canonical_url(pdf_links[0]) if pdf_links else ""
    if document_url:
        remaining_specs.append(f"Product document: {document_url}")
    description_parts = [part for part in (meta_description, detail_text) if part]

    return {
        "sourceUrl": url,
        "sourceUrls": [url],
        "sourceEnquiryId": enquiry_match.group(1) if enquiry_match else "",
        "name": name,
        "sourceName": name,
        "slug": slugify(re.sub(r"-details\.html$", "", urllib.parse.urlsplit(url).path.rsplit("/", 1)[-1])),
        "sku": code,
        "summary": meta_description,
        "description": "\n\n".join(description_parts),
        "imageSourceUrl": canonical_url(images[0]) if images else "",
        "imageUrl": "",
        "packSize": " · ".join(packing_values),
        "applications": "\n".join(remaining_specs),
        "documentUrl": document_url,
        "specifications": [{"label": key, "value": value} for key, value in specs],
        "metaTitle": tidy((doc.xpath("//title/text()") or [""])[0]),
        "metaDescription": meta_description,
        "categorySourceUrls": [],
    }


def prefer_product(current: dict, candidate: dict) -> tuple[dict, dict]:
    current_regional = bool(COUNTRY_RE.search(current["sourceName"]))
    candidate_regional = bool(COUNTRY_RE.search(candidate["sourceName"]))
    if current_regional and not candidate_regional:
        return candidate, current
    current_score = len(current.get("specifications", [])) + bool(current.get("description"))
    candidate_score = len(candidate.get("specifications", [])) + bool(candidate.get("description"))
    if candidate_score > current_score:
        return candidate, current
    return current, candidate


def merge_products(products: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for product in products:
        base_key = normalize_name(product["name"])
        key = base_key
        if key not in merged:
            merged[key] = product
            continue
        current = merged[key]
        current_is_regional = bool(
            COUNTRY_RE.search(current.get("sourceName", ""))
            or any(COUNTRY_RE.search(url) for url in current.get("sourceUrls", []))
        )
        product_is_regional = bool(
            COUNTRY_RE.search(product.get("sourceName", ""))
            or any(COUNTRY_RE.search(url) for url in product.get("sourceUrls", []))
        )
        if not current_is_regional and not product_is_regional:
            distinct_key = f"{base_key}:{product.get('sourceEnquiryId') or product['sourceUrl']}"
            merged[distinct_key] = product
            continue
        winner, other = prefer_product(merged[key], product)
        winner["sourceUrls"] = sorted(set(winner.get("sourceUrls", []) + other.get("sourceUrls", [])))
        winner["categorySourceUrls"] = sorted(
            set(winner.get("categorySourceUrls", []) + other.get("categorySourceUrls", []))
        )
        if not winner.get("imageSourceUrl"):
            winner["imageSourceUrl"] = other.get("imageSourceUrl", "")
        if not winner.get("documentUrl"):
            winner["documentUrl"] = other.get("documentUrl", "")
        if not winner.get("description"):
            winner["description"] = other.get("description", "")
        merged[key] = winner
    return list(merged.values())


def image_extension(url: str, content_type: str) -> str:
    suffix = Path(urllib.parse.unquote(urllib.parse.urlsplit(url).path)).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    guessed = mimetypes.guess_extension(content_type) or ".jpg"
    return ".jpg" if guessed == ".jpe" else guessed


def download_image(product: dict) -> tuple[str, str]:
    for extension in (".jpg", ".png", ".webp", ".gif"):
        destination = IMAGE_DIR / f"{product['slug']}{extension}"
        if destination.exists() and destination.stat().st_size >= 300:
            return product["slug"], f"/imported-products/{destination.name}"

    sources = [
        source
        for source in (
            product.get("imageSourceUrl", ""),
            product.get("fallbackImageSourceUrl", ""),
        )
        if source
    ]
    for source in dict.fromkeys(sources):
        try:
            _, body, content_type = fetch(source)
            if not content_type.startswith("image/") or len(body) < 300:
                continue
            extension = image_extension(source, content_type)
            filename = f"{product['slug']}{extension}"
            destination = IMAGE_DIR / filename
            destination.write_bytes(body)
            return product["slug"], f"/imported-products/{filename}"
        except Exception as error:  # noqa: BLE001
            print(f"image warning: {source}: {error}", file=sys.stderr)
    return product["slug"], ""


def main() -> int:
    urls = extract_urls()
    _, category_index_body, category_index_type = fetch(CATEGORY_INDEX_URL)
    if "html" not in category_index_type:
        raise RuntimeError("The public category index did not return HTML.")
    category_index_doc = parse_document(category_index_body)
    (
        authoritative_mapping,
        authoritative_parents,
        authoritative_subcategories,
        authoritative_parent_sources,
    ) = extract_sidebar_mapping(category_index_doc)
    category_index_urls = {
        canonical_url(href)
        for href in category_index_doc.xpath("//a[contains(@href, '/category/')]/@href")
    }
    category_selector_urls = {
        canonical_url(value)
        for value in category_index_doc.xpath("//option[contains(@value, '/products/')]/@value")
    }
    detail_urls = [url for url in urls if url.endswith("-details.html")]
    listing_urls = sorted(
        {
            url
            for url in urls
            if "/products/" in url and "product-enquiry-" not in url
        }
        | set(authoritative_mapping)
        | category_index_urls
        | category_selector_urls
        | {
            url
            for url in urls
            if "/category/" in url
        }
    )
    print(f"Inventory: {len(detail_urls)} detail pages, {len(listing_urls)} listing pages", flush=True)

    fetched_listings: dict[str, bytes] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch, url): url for url in listing_urls}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            url = futures[future]
            try:
                _, body, content_type = future.result()
                if "html" in content_type:
                    fetched_listings[url] = body
            except Exception as error:  # noqa: BLE001
                print(f"listing warning: {url}: {error}", file=sys.stderr)
            if index % 20 == 0:
                print(f"Listing pages: {index}/{len(futures)}", flush=True)

    listings = [extract_listing(url, body) for url, body in fetched_listings.items()]
    linked_detail_urls = {
        product["url"]
        for listing in listings
        for product in listing["products"]
        if product["url"]
    }
    detail_urls = sorted(set(detail_urls) | linked_detail_urls)
    print(
        f"Detail inventory after category discovery: {len(detail_urls)} pages "
        f"({len(linked_detail_urls)} linked from active listings)",
        flush=True,
    )
    sidebar_mapping: dict[str, str] = dict(authoritative_mapping)
    parent_definitions: dict[str, dict] = dict(authoritative_parents)
    subcategory_definitions: dict[str, dict] = dict(authoritative_subcategories)
    parent_source_mapping: dict[str, str] = dict(authoritative_parent_sources)
    for body in fetched_listings.values():
        child_map, parents, subcategories, parent_sources = extract_sidebar_mapping(
            parse_document(body)
        )
        sidebar_mapping.update(child_map)
        parent_definitions.update(parents)
        subcategory_definitions.update(subcategories)
        parent_source_mapping.update(parent_sources)

    product_to_listings: dict[str, list[dict]] = defaultdict(list)
    for listing in listings:
        for product in listing["products"]:
            if product["url"]:
                product_to_listings[product["url"]].append(listing)

    extracted_products: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch, url): url for url in detail_urls}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            url = futures[future]
            try:
                _, body, content_type = future.result()
                if "html" not in content_type:
                    continue
                product = extract_product(url, body)
                if product:
                    related_listings = product_to_listings.get(url, [])
                    product["categorySourceUrls"] = [listing["sourceUrl"] for listing in related_listings]
                    listing_images = [
                        listed_product["imageUrl"]
                        for listing in related_listings
                        for listed_product in listing["products"]
                        if listed_product["url"] == url and listed_product["imageUrl"]
                    ]
                    product["fallbackImageSourceUrl"] = listing_images[0] if listing_images else ""
                    extracted_products.append(product)
            except Exception as error:  # noqa: BLE001
                print(f"product warning: {url}: {error}", file=sys.stderr)
            if index % 25 == 0:
                print(f"Product pages: {index}/{len(futures)}", flush=True)

    extracted_keys = {normalize_name(product["name"]) for product in extracted_products}
    for listing in listings:
        for listed_product in listing["products"]:
            key = normalize_name(listed_product["name"])
            if key in extracted_keys:
                continue
            slug = slugify(listed_product["name"])
            enquiry_id = listed_product.get("sourceEnquiryId", "")
            extracted_products.append(
                {
                    "sourceUrl": listing["sourceUrl"],
                    "sourceUrls": [listing["sourceUrl"]],
                    "sourceEnquiryId": enquiry_id,
                    "name": listed_product["name"],
                    "sourceName": listed_product["name"],
                    "slug": slug,
                    "sku": f"HL-WEB-{enquiry_id or hashlib.sha1((listing['sourceUrl'] + slug).encode()).hexdigest()[:8].upper()}",
                    "summary": "",
                    "description": "",
                    "imageSourceUrl": listed_product["imageUrl"],
                    "fallbackImageSourceUrl": "",
                    "imageUrl": "",
                    "packSize": "",
                    "applications": "",
                    "documentUrl": "",
                    "specifications": [],
                    "metaTitle": listed_product["name"],
                    "metaDescription": "",
                    "categorySourceUrls": [listing["sourceUrl"]],
                }
            )
            extracted_keys.add(key)

    products = merge_products(extracted_products)
    print(f"Active products: {len(extracted_products)}; after regional merge: {len(products)}", flush=True)

    listing_by_url = {listing["sourceUrl"]: listing for listing in listings}
    category_records: dict[str, dict] = {}
    for parent_slug, parent in parent_definitions.items():
        category_records[parent_slug] = {
            "id": f"import-cat-{parent_slug}",
            "name": parent["name"],
            "slug": parent_slug,
            "description": "",
            "parentId": None,
            "imageUrl": "",
            "accent": "blue",
            "featured": True,
            "sortOrder": len(category_records) * 100 + 100,
            "sourceUrl": parent.get("sourceUrl", ""),
        }

    specialty_slug = "specialty-products"
    category_records.setdefault(
        specialty_slug,
        {
            "id": f"import-cat-{specialty_slug}",
            "name": "Specialty Products",
            "slug": specialty_slug,
            "description": "",
            "parentId": None,
            "imageUrl": "",
            "accent": "violet",
            "featured": True,
            "sortOrder": 9900,
            "sourceUrl": "",
        },
    )

    for source_url, subcategory in subcategory_definitions.items():
        parent_slug = subcategory["parentSlug"]
        child_slug = slugify(subcategory["name"])
        if child_slug == parent_slug:
            continue
        listing = listing_by_url.get(source_url)
        category_records.setdefault(
            child_slug,
            {
                "id": f"import-cat-{child_slug}",
                "name": subcategory["name"],
                "slug": child_slug,
                "description": listing["description"] if listing else "",
                "parentId": f"import-cat-{parent_slug}",
                "imageUrl": "",
                "accent": "cyan" if parent_slug == "tts-products" else "green",
                "featured": False,
                "sortOrder": len(category_records) * 100 + 100,
                "sourceUrl": source_url,
            },
        )

    for listing in listings:
        if not listing["products"]:
            continue
        child_slug = slugify(listing["name"])
        parent_slug = sidebar_mapping.get(listing["sourceUrl"], specialty_slug)
        if child_slug == parent_slug:
            record = category_records[parent_slug]
            if listing["description"] and not record["description"]:
                record["description"] = listing["description"]
            record["sourceUrl"] = listing["sourceUrl"]
            continue
        category_records.setdefault(
            child_slug,
            {
                "id": f"import-cat-{child_slug}",
                "name": listing["name"],
                "slug": child_slug,
                "description": listing["description"],
                "parentId": f"import-cat-{parent_slug}",
                "imageUrl": "",
                "accent": "cyan" if parent_slug == "tts-products" else "green",
                "featured": False,
                "sortOrder": len(category_records) * 100 + 100,
                "sourceUrl": listing["sourceUrl"],
            },
        )

    used_slugs: set[str] = set()
    for product in sorted(products, key=lambda item: item["name"].lower()):
        base_slug = slugify(COUNTRY_RE.sub("", product["slug"]))
        slug = base_slug
        if slug in used_slugs:
            suffix = product.get("sourceEnquiryId") or hashlib.sha1(product["sourceUrl"].encode()).hexdigest()[:6]
            slug = f"{base_slug}-{suffix}"
        used_slugs.add(slug)
        product["slug"] = slug

        listing_candidates = [
            listing_by_url[url]
            for url in product.get("categorySourceUrls", [])
            if url in listing_by_url
        ]
        listing_candidates.sort(key=lambda item: bool(COUNTRY_RE.search(item["name"])))
        if listing_candidates:
            selected_listing = listing_candidates[0]
            if selected_listing["sourceUrl"] in subcategory_definitions:
                category_slug = slugify(
                    subcategory_definitions[selected_listing["sourceUrl"]]["name"]
                )
            elif selected_listing["sourceUrl"] in parent_source_mapping:
                category_slug = parent_source_mapping[selected_listing["sourceUrl"]]
            else:
                category_slug = slugify(selected_listing["name"])
            if category_slug not in category_records:
                category_slug = specialty_slug
        else:
            category_slug = specialty_slug
        product["categoryId"] = f"import-cat-{category_slug}"
        product["id"] = f"import-product-{slug}"
        product["sku"] = product["sku"] or f"HL-WEB-{product.get('sourceEnquiryId') or hashlib.sha1(product['sourceUrl'].encode()).hexdigest()[:8].upper()}"
        product["featured"] = False
        product["eco"] = bool(re.search(r"green|organic|biodegradable|environmental", f"{product['name']} {category_slug}", re.I))
        product["status"] = "published"
        product["sortOrder"] = 100

    products_by_sku: dict[str, list[dict]] = defaultdict(list)
    for product in products:
        products_by_sku[product["sku"].casefold()].append(product)
    for duplicates in products_by_sku.values():
        if len(duplicates) < 2:
            continue
        original_sku = duplicates[0]["sku"]
        for product in duplicates:
            detail_line = f"Product code: {original_sku}"
            product["applications"] = "\n".join(
                [detail_line, product["applications"]] if product["applications"] else [detail_line]
            )
            suffix = product.get("sourceEnquiryId") or product["slug"]
            product["sku"] = f"{original_sku}-{suffix}"

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download_image, product): product for product in products}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            product = futures[future]
            _, image_url = future.result()
            product["imageUrl"] = image_url
            if image_url:
                category = category_records.get(product["categoryId"].removeprefix("import-cat-"))
                if category and not category["imageUrl"]:
                    category["imageUrl"] = image_url
            if index % 25 == 0:
                print(f"Product images: {index}/{len(futures)}", flush=True)

    for category in category_records.values():
        if not category["parentId"] or not category["imageUrl"]:
            continue
        parent = category_records.get(category["parentId"].removeprefix("import-cat-"))
        if parent and not parent["imageUrl"]:
            parent["imageUrl"] = category["imageUrl"]

    top_categories = [record for record in category_records.values() if record["parentId"] is None]
    for index, record in enumerate(sorted(top_categories, key=lambda item: item["name"]), 1):
        record["sortOrder"] = index * 100
    child_groups: dict[str, list[dict]] = defaultdict(list)
    for record in category_records.values():
        if record["parentId"]:
            child_groups[record["parentId"]].append(record)
    for children in child_groups.values():
        for index, record in enumerate(sorted(children, key=lambda item: item["name"]), 1):
            parent = category_records[record["parentId"].removeprefix("import-cat-")]
            record["sortOrder"] = parent["sortOrder"] + index

    category_order = {record["id"]: record["sortOrder"] for record in category_records.values()}
    products.sort(key=lambda item: (category_order.get(item["categoryId"], 99999), item["name"].lower()))
    for index, product in enumerate(products, 1):
        product["sortOrder"] = index * 10
        product["featured"] = index <= 8

    payload = {
        "version": "hygienelinks-public-2026-07-31-v1",
        "source": "https://www.hygienelinks.com/sitemap.xml",
        "categories": sorted(category_records.values(), key=lambda item: item["sortOrder"]),
        "products": products,
        "stats": {
            "sitemapUrls": len(urls),
            "detailPages": len(detail_urls),
            "activeProducts": len(extracted_products),
            "mergedProducts": len(products),
            "categories": len(category_records),
            "images": sum(bool(product["imageUrl"]) for product in products),
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["stats"], indent=2), flush=True)
    print(f"Wrote {OUTPUT}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
