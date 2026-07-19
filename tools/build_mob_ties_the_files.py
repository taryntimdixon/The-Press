#!/usr/bin/env python3
"""Render the Mob Ties: The Files source fragments from its page manifest."""

from __future__ import annotations

import html
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets/mob-ties-the-files/manifest.json"
PAGE_ASSET_DIR = MANIFEST_PATH.parent / "pages"
BODY_PATH = ROOT / "content/bodies/memory-mob-ties-the-files.html"
ASIDE_PATH = ROOT / "content/asides/memory-mob-ties-the-files.html"
SMALL_NUMBER_WORDS = (
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
)


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def prose_count(value: int) -> str:
    return SMALL_NUMBER_WORDS[value] if 0 <= value < len(SMALL_NUMBER_WORDS) else str(value)


def require_nonempty_string(item: dict, field: str, context: str) -> str:
    value = item.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context} requires a nonempty string field '{field}'")
    return value


def require_positive_dimension(page: dict, field: str, context: str) -> int:
    value = page.get(field)
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{context} field '{field}' must be a positive integer")
    return value


def validate_manifest(manifest: object) -> dict:
    """Validate inputs and return a copy with canonical plate numbers."""
    if not isinstance(manifest, dict):
        raise ValueError("Manifest root must be an object")

    for field in ("title", "status", "disclosure"):
        require_nonempty_string(manifest, field, "Manifest")

    raw_chapters = manifest.get("chapters")
    if not isinstance(raw_chapters, list) or not raw_chapters:
        raise ValueError("Manifest field 'chapters' must be a nonempty array")

    chapters = []
    chapter_ids = []
    chapter_numbers = set()
    for index, raw_chapter in enumerate(raw_chapters, start=1):
        context = f"Chapter {index}"
        if not isinstance(raw_chapter, dict):
            raise ValueError(f"{context} must be an object")
        chapter = dict(raw_chapter)
        chapter_id = require_nonempty_string(chapter, "id", context)
        chapter_number = require_nonempty_string(chapter, "number", context)
        require_nonempty_string(chapter, "title", context)
        require_nonempty_string(chapter, "dek", context)
        if chapter_id in chapter_ids:
            raise ValueError(f"Duplicate chapter id: {chapter_id}")
        if chapter_number in chapter_numbers:
            raise ValueError(f"Duplicate chapter number: {chapter_number}")
        chapter_ids.append(chapter_id)
        chapter_numbers.add(chapter_number)
        chapters.append(chapter)

    raw_pages = manifest.get("pages")
    if not isinstance(raw_pages, list):
        raise ValueError("Manifest field 'pages' must be an array")

    pages = []
    seen_files = set()
    for plate_number, raw_page in enumerate(raw_pages, start=1):
        context = f"Page at manifest.pages[{plate_number - 1}]"
        if not isinstance(raw_page, dict):
            raise ValueError(f"{context} must be an object")
        page = dict(raw_page)
        filename = require_nonempty_string(page, "file", context)
        chapter_id = require_nonempty_string(page, "chapter", context)
        require_nonempty_string(page, "title", context)
        require_nonempty_string(page, "alt", context)
        require_positive_dimension(page, "width", context)
        require_positive_dimension(page, "height", context)

        if chapter_id not in chapter_ids:
            raise ValueError(f"{context} references unknown chapter id: {chapter_id}")
        if Path(filename).name != filename or "/" in filename or "\\" in filename:
            raise ValueError(f"{context} field 'file' must be a filename, got: {filename}")
        if Path(filename).suffix.lower() != ".webp":
            raise ValueError(f"{context} field 'file' must reference a WebP asset: {filename}")
        file_key = filename.casefold()
        if file_key in seen_files:
            raise ValueError(f"Duplicate page filename: {filename}")
        seen_files.add(file_key)
        if not (PAGE_ASSET_DIR / filename).is_file():
            raise ValueError(f"{context} references missing asset: {filename}")

        page["plate"] = plate_number
        pages.append(page)

    pages_by_chapter = {chapter_id: [] for chapter_id in chapter_ids}
    for page in pages:
        pages_by_chapter[page["chapter"]].append(page)
    empty_chapters = [chapter_id for chapter_id, chapter_pages in pages_by_chapter.items() if not chapter_pages]
    if empty_chapters:
        raise ValueError(f"Every chapter must contain at least one page; empty chapters: {', '.join(empty_chapters)}")

    normalized = dict(manifest)
    normalized["chapters"] = chapters
    normalized["pages"] = pages
    return normalized


def group_pages_by_chapter(manifest: dict) -> dict[str, list[dict]]:
    grouped = {chapter["id"]: [] for chapter in manifest["chapters"]}
    for page in manifest["pages"]:
        grouped[page["chapter"]].append(page)
    return grouped


def render_aside(manifest: dict) -> str:
    chapter_count = len(manifest["chapters"])
    chapter_count_text = prose_count(chapter_count)
    pages_by_chapter = group_pages_by_chapter(manifest)
    chapter_items = "\n".join(
        f'      <li><a href="#page-{pages_by_chapter[chapter["id"]][0]["plate"]}">'
        f'{esc(chapter["number"])}. {esc(chapter["title"])}</a></li>'
        for chapter in manifest["chapters"]
    )
    return f'''<!-- Generated by tools/build_mob_ties_the_files.py. -->
<div class="sticky-stack">
  <section class="info-box">
    <h2>On this page</h2>
    <ol class="toc-list">
{chapter_items}
    </ol>
  </section>

  <section class="info-box">
    <h2>Working sequence</h2>
    <p>This is a provisional {chapter_count_text}-chapter order for all {len(manifest["pages"])} plates. The sequence is controlled by the article manifest and can be rearranged without renaming the artwork.</p>
  </section>

  <section class="info-box">
    <h2>Image note</h2>
    <p>{esc(manifest["disclosure"])}</p>
  </section>

  <section class="info-box">
    <h2>Content note</h2>
    <p>Several later plates contain illustrated crime scenes, blood, autopsy diagrams, and firearm imagery.</p>
  </section>
</div>
'''


def render_page(page: dict) -> str:
    number = page["plate"]
    warning = (
        '<span class="press-image-edition__content-flag">Illustrated crime-scene imagery</span>'
        if page.get("graphic")
        else ""
    )
    return f'''  <section class="press-image-edition__page" id="page-{number}" aria-labelledby="mob-ties-files-page-{number}-title" data-plate="{number}">
    <h2 class="sr-only" id="mob-ties-files-page-{number}-title">{esc(page["title"])}</h2>
    <figure class="press-image-edition__sheet">
      <img src="assets/mob-ties-the-files/pages/{esc(page["file"])}" alt="{esc(page["alt"])}" loading="lazy" decoding="async" width="{page["width"]}" height="{page["height"]}" style="aspect-ratio:{page["width"]} / {page["height"]}">
      <figcaption><span>Plate {number:02d}</span><strong>{esc(page["title"])}</strong>{warning}</figcaption>
    </figure>
  </section>'''


def render_body(manifest: dict) -> str:
    page_count = len(manifest["pages"])
    page_markup = "\n".join(render_page(page) for page in manifest["pages"])

    return f'''<!-- Generated by tools/build_mob_ties_the_files.py. -->
<section class="article-body press-feature-body press-social-feature press-image-edition press-image-edition--archive press-image-edition--evidence-lightbox" data-page-count="{page_count}">
{page_markup}
</section>
'''


def main() -> None:
    try:
        manifest = validate_manifest(json.loads(MANIFEST_PATH.read_text(encoding="utf-8")))
        body = render_body(manifest)
        aside = render_aside(manifest)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(f"Cannot render Mob Ties manifest: {exc}") from exc

    BODY_PATH.write_text(body, encoding="utf-8")
    ASIDE_PATH.write_text(aside, encoding="utf-8")
    print(f"Rendered {len(manifest['pages'])} plates to {BODY_PATH.relative_to(ROOT)}")
    print(f"Rendered chapter notes to {ASIDE_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
