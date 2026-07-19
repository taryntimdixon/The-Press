#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from datetime import datetime
from email.utils import format_datetime
import hashlib
import html
import json
import math
import os
import re

SITE_DIR = Path(__file__).resolve().parent
STUDIO_DIR = SITE_DIR / "studio"
DATA_DIR = STUDIO_DIR if (STUDIO_DIR / "master-edition.json").exists() else SITE_DIR
DATA = json.loads((DATA_DIR / "master-edition.json").read_text(encoding="utf-8"))

SITE = DATA["site"]
SECTIONS = DATA["sections"]
AUTHORS = DATA["authors"]
STORIES = sorted(DATA["stories"], key=lambda item: item["publishedIso"], reverse=True)
SECTION_BY_SLUG = {section["slug"]: section for section in SECTIONS}
AUTHOR_BY_SLUG = {author["slug"]: author for author in AUTHORS}
STORY_BY_FILE = {story["filename"]: story for story in STORIES}
HOME_HERO_TARGET = int(DATA.get("homepage", {}).get("heroSlots", 7) or 7)
HOME_HERO_AUTO_SEED = min(2, HOME_HERO_TARGET)


def parse_iso_datetime(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def latest_story_datetime() -> datetime:
    dates = [
        parsed
        for story in STORIES
        for key in ("updatedIso", "publishedIso")
        if (parsed := parse_iso_datetime(story.get(key)))
    ]
    return max(dates) if dates else datetime.now().astimezone()


BUILD_REFERENCE_DT = latest_story_datetime()
try:
  STYLESHEET_VERSION = str(int((SITE_DIR / "styles.css").stat().st_mtime))
except OSError:
  STYLESHEET_VERSION = "1"
try:
  APP_VERSION = str(int((SITE_DIR / "app.js").stat().st_mtime))
except OSError:
  APP_VERSION = "1"

PRESS_FONT_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700&family=Space+Mono:wght@400;700&display=swap"


def asset_version(rel_path: str) -> str:
    try:
        return str(int((SITE_DIR / rel_path).stat().st_mtime))
    except OSError:
        return "1"


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"", "0", "false", "no", "off"}


def h(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


BELOW_FOLD_NEWSSTAND_URL = "below-the-fold.html"
BELOW_FOLD_REGISTRY_PATH = SITE_DIR / "data" / "below-the-fold.json"
ARTICLE_SPREAD_START = datetime.fromisoformat("2026-05-11T09:00:00-04:00")
ARTICLE_SPREAD_VARIANTS = 5
ARTICLE_LATEST_COUNT = 5
CARTEL_FLAGSHIP_FILENAME = "world-cartels-beneath-the-state.html"
BELOW_FOLD_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def is_below_fold_url(value: object) -> bool:
    path = str(value or "").strip().lower().split("?", 1)[0].split("#", 1)[0].lstrip("./")
    return path == BELOW_FOLD_NEWSSTAND_URL or path.startswith("below-the-fold/")


def is_below_fold_index_item(item: dict) -> bool:
    section = str(item.get("section") or item.get("section_slug") or item.get("sectionSlug") or "").strip().lower()
    story_type = str(item.get("type") or item.get("kind") or item.get("story_type") or "").strip().lower()
    if item.get("newsstandOnly") is True or item.get("excludeFromEdition") is True:
        return True
    if is_below_fold_url(item.get("url") or item.get("filename") or item.get("href") or item.get("link")):
        return True
    return section in {"below the fold", "below-the-fold"} or story_type in {"newsstand", "issue"}


def is_cartoon_index_item(item: dict) -> bool:
    section = str(item.get("section") or item.get("section_slug") or item.get("sectionSlug") or "").strip().lower()
    path = str(item.get("url") or item.get("filename") or item.get("href") or item.get("link") or "").strip().lower()
    path = path.split("?", 1)[0].split("#", 1)[0].lstrip("./")
    return section == "cartoons" or path.startswith("cartoons-") or "/cartoons-" in path


def shared_archive_stories() -> list[dict]:
    return [story for story in STORIES if not is_cartoon_index_item(story)]


def story_spread_variant(story: dict) -> int | None:
    if is_cartoon_index_item(story) or is_below_fold_index_item(story):
        return None
    published = parse_iso_datetime(story.get("publishedIso")) or parse_iso_datetime(story.get("updatedIso"))
    if not published or published < ARTICLE_SPREAD_START:
        return None

    key = "|".join(
        str(story.get(field) or "").strip()
        for field in ("slug", "filename", "title")
    )
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (int(digest[:8], 16) % ARTICLE_SPREAD_VARIANTS) + 1


def story_article_rank(story: dict) -> int:
    filename = str(story.get("filename") or "").strip()
    slug = str(story.get("slug") or "").strip()
    for index, item in enumerate(STORIES):
        if filename and filename == str(item.get("filename") or "").strip():
            return index
        if slug and slug == str(item.get("slug") or "").strip():
            return index
    return len(STORIES)


def is_latest_five_story(story: dict) -> bool:
    return story_article_rank(story) < ARTICLE_LATEST_COUNT


def story_article_design(story: dict) -> str:
    filename = str(story.get("filename") or "").strip()
    if filename == CARTEL_FLAGSHIP_FILENAME:
        return "cartel-flagship"
    if is_cartoon_index_item(story):
        return "cartoon-poster"

    section = str(story.get("sectionSlug") or story.get("section") or "").strip().lower()
    story_type = str(story.get("type") or "").strip().lower()

    if "investigation" in story_type and section in {"technology", "science", "systems", "economics", "money"}:
        return "ledger"
    if "investigation" in story_type or section in {"world", "politics", "power", "geopolitics"}:
        return "frontpage"
    if section in {"sports", "pop-culture", "culture", "film", "food", "the-weird-file"}:
        return "tabloid"
    if section in {"health", "science", "climate", "education", "life"}:
        return "magazine"
    if section in {"technology", "systems", "memory", "ai"}:
        return "ledger"
    if "analysis" in story_type:
        return "broadsheet"
    return "broadsheet"


def render_article_folio(story: dict) -> str:
    section = str(story.get("section") or "News").strip() or "News"
    published = str(story.get("publishedLabel") or story.get("publishedIso") or "").strip()
    published_label = f"Published {published}" if published else "Published"
    return f"""
<div class="article-folio" aria-label="Article navigation and sharing">
  <a class="article-folio__home" href="index.html" aria-label="{h(SITE['name'])} home">{h(SITE['name'])}</a>
  <span class="article-folio__desk">{h(section)} Desk</span>
  <span class="article-folio__date">{h(published_label)}</span>
  <div class="article-folio__share" data-article-folio-share aria-label="Share this article"></div>
</div>
""".strip()


def render_article_companion_rail(story: dict, design_key: str) -> str:
    related = related_stories(story)
    section = str(story.get("section") or "News").strip() or "News"
    story_type = str(story.get("type") or "Feature").strip() or "Feature"
    rail_label = {
        "cartel-flagship": "Flagship file",
        "cartoon-poster": "Cartoon file",
        "ledger": "Ledger file",
        "frontpage": "Front page file",
        "tabloid": "Culture file",
        "magazine": "Feature file",
    }.get(design_key, "Article file")
    image = story.get("heroImage") or story.get("image") or ""
    image_alt = public_image_alt(story, story.get("title"))
    related_items = "\n".join(
        f'<li><a href="{h(item["filename"])}">{h(item["title"])}</a><span>{h(item.get("section") or "News")}</span></li>'
        for item in related[:3]
    )
    if not related_items:
        related_items = '<li><span>More related reads will appear as the desk grows.</span></li>'
    metric_rows = [
        ("Section", section),
        ("Type", story_type),
        ("Read", story.get("readTime") or ""),
        ("Length", story.get("wordCount") or ""),
    ]
    metric_html = "\n".join(
        f'<div><dt>{h(label)}</dt><dd>{h(value)}</dd></div>'
        for label, value in metric_rows
        if str(value or "").strip()
    )
    image_html = (
        f"""  <figure class="heritage-rail-card__thumb">
    <img src="{h(image)}" alt="{h(image_alt)}" loading="lazy" decoding="async" />
  </figure>
""".rstrip()
        if image
        else ""
    )
    return f"""
<aside class="article-companion-rail" aria-label="Article companion rail">
  <section class="heritage-rail-card heritage-rail-card--cover">
    <p class="heritage-rail-card__kicker">{h(rail_label)}</p>
{image_html}
    <h3>{h(story.get("title") or section)}</h3>
    <dl class="heritage-rail-card__meta">
      {metric_html}
    </dl>
  </section>
  <section class="heritage-rail-card heritage-rail-card--related">
    <p class="heritage-rail-card__kicker">Read next</p>
    <ol>
      {related_items}
    </ol>
  </section>
</aside>
""".strip()


def load_below_fold_issues() -> list[dict]:
    if not BELOW_FOLD_REGISTRY_PATH.exists():
        return []
    payload = json.loads(BELOW_FOLD_REGISTRY_PATH.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        rows = payload.get("issues", [])
    elif isinstance(payload, list):
        rows = payload
    else:
        raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: registry must be a JSON object or list")
    if not isinstance(rows, list):
        raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issues must be a list")
    issues = []
    seen_slugs: set[str] = set()
    seen_numbers: set[int] = set()
    for index, item in enumerate(rows, 1):
        if not isinstance(item, dict):
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue row {index} must be an object")
        issue = dict(item)
        slug = str(issue.get("slug") or "").strip()
        if not slug:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue row {index} needs a slug")
        if not BELOW_FOLD_SLUG_RE.fullmatch(slug):
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue slug {slug!r} must use lowercase letters, numbers, and hyphens")
        if slug in seen_slugs:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: duplicate issue slug {slug!r}")
        seen_slugs.add(slug)
        issue["slug"] = slug
        try:
            issue_number = int(issue.get("issueNumber") or 0)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} needs a numeric issueNumber") from exc
        if issue_number < 1:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} needs a positive issueNumber")
        if issue_number in seen_numbers:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: duplicate issueNumber {issue_number}")
        seen_numbers.add(issue_number)
        issue["issueNumber"] = issue_number
        expected_url = f"below-the-fold/{slug}.html"
        issue_url = str(issue.get("url") or expected_url).strip().lstrip("/")
        if issue_url != expected_url:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} must use url {expected_url!r}")
        issue["url"] = issue_url
        body_file = str(issue.get("bodyFile") or "").strip()
        if body_file:
            body_path = Path(body_file)
            if body_path.is_absolute() or ".." in body_path.parts:
                raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} bodyFile must be a safe relative path")
            if not body_file.startswith("content/below-fold/"):
                raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} bodyFile must live under content/below-fold/")
            issue["bodyFile"] = body_file
        if not str(issue.get("renderer") or "").strip() and not body_file:
            raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {slug!r} needs a renderer or bodyFile")
        issue.setdefault("title", slug.replace("-", " ").title())
        issue.setdefault("kicker", "Below the Fold")
        issue.setdefault("rubric", "Below the Fold")
        issue.setdefault("sectionLabel", "The Newsstand")
        issue.setdefault("dateLabel", "")
        issue.setdefault("publishedIso", "")
        issue.setdefault("dek", "")
        issue.setdefault("imageAlt", issue["title"])
        issues.append(issue)
    return sorted(issues, key=lambda issue: issue["issueNumber"])


BELOW_FOLD_ISSUES = load_below_fold_issues()


def below_fold_issues_newest() -> list[dict]:
    return sorted(BELOW_FOLD_ISSUES, key=lambda issue: issue["issueNumber"], reverse=True)


def below_fold_latest_issue() -> dict | None:
    issues = below_fold_issues_newest()
    return issues[0] if issues else None


PUBLIC_AUTHOR_LABEL = "The Press"
FOURTH_WALL_RE = re.compile(
    r"ai[- ]generated|ai[- ]written|ai[- ]drafted|written and researched by ai|"
    r"intelligent ai|not a documentary|real social-media screenshot|official fifa image|"
    r"editorial workflow|source drawer|living article kit|live browser tools|static story",
    re.I,
)


def public_author(value: object) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text or re.search(r"^(?:intelligent ai|ai|written and researched by ai)$", text, re.I):
        return PUBLIC_AUTHOR_LABEL
    return re.sub(r"^By\s+", "", text, flags=re.I).strip() or PUBLIC_AUTHOR_LABEL


def public_byline(story: dict) -> str:
    return f"By {public_author(story.get('author'))}"


def public_meta(story: dict) -> str:
    return f"{h(public_byline(story))} • {h(story['publishedLabel'])}"


def clean_public_image_text(value: object, fallback: object = "") -> str:
    text = html.unescape(re.sub(r"\s+", " ", str(value or "")).strip())
    if not text:
        return str(fallback or "Story image")
    text = re.sub(r"\bAI[- ]generated\b\s*", "", text, flags=re.I)
    text = re.sub(r"\bphotorealistic editorial\b", "editorial", text, flags=re.I)
    text = re.sub(r"\bphotorealistic editorial image for\s*", "", text, flags=re.I)
    text = re.sub(r"\beditorial visual of\s*", "", text, flags=re.I)
    text = re.sub(r"\beditorial thumbnail for:\s*", "", text, flags=re.I)
    text = re.sub(r"\beditorial illustration for:\s*", "", text, flags=re.I)
    text = re.sub(r"\beditorial image of\b", "image of", text, flags=re.I)
    text = re.sub(r"\beditorial image for\b", "image for", text, flags=re.I)
    text = re.sub(r"\beditorial composite\b", "image", text, flags=re.I)
    text = re.sub(r"\s*Not a documentary[^.]*\.", "", text, flags=re.I)
    text = re.sub(r"\s*not documentary evidence[^.]*\.", "", text, flags=re.I)
    text = re.sub(r"\s*not a real social-media screenshot[^.]*\.", "", text, flags=re.I)
    text = re.sub(r"\s*or official FIFA image[^.]*\.", ".", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" .")
    if not text or FOURTH_WALL_RE.search(text):
        return str(fallback or "Story image")
    return text[:1].upper() + text[1:]


def public_image_alt(story_or_value: object, fallback: object = "") -> str:
    if isinstance(story_or_value, dict):
        return clean_public_image_text(story_or_value.get("imageAlt"), story_or_value.get("title") or fallback)
    return clean_public_image_text(story_or_value, fallback)


def public_image_credit(value: object) -> str:
    text = html.unescape(re.sub(r"\s+", " ", str(value or "")).strip())
    if not text or FOURTH_WALL_RE.search(text):
        return ""
    return text


def public_image_caption(story: dict) -> str:
    if story.get("imageAiGenerated") is True:
        return ""
    for key in ("imageCaptionHtml", "imageCaption", "imageCreditPlain"):
        text = str(story.get(key) or "").strip()
        if text and public_image_credit(text):
            return text
    return ""


def public_nav_label(value: object) -> str:
    text = str(value or "").strip()
    if re.search(r"ai newsroom|ai pledge", text, re.I):
        return "Masthead"
    return text


def json_script(data: object) -> str:
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def absolute_url(path: str) -> str:
    return SITE["baseUrl"].rstrip("/") + "/" + path.lstrip("/")


def versioned_asset_url(path: str) -> str:
    value = str(path or "")
    if not value or re.match(r"^[a-z][a-z0-9+.-]*:", value, re.I) or "?" in value:
        return value
    return f"{value}?v={asset_version(value)}"


def preferred_image_path(image_path: str) -> str:
  rel = Path(image_path)
  if not image_path:
    return image_path
  if rel.is_absolute():
    return image_path
  source = SITE_DIR / rel
  if not source.exists():
    return image_path

  # Prefer lossless/local higher-fidelity variants if they exist for the same stem.
  preferred_exts = (".png", ".webp", ".jpg", ".jpeg", ".avif")
  stem = source.with_suffix("")
  for ext in preferred_exts:
    candidate = stem.with_suffix(ext)
    if candidate.exists():
      return str(rel.with_suffix(ext))
  return image_path


def story_has_hero_image(story: dict) -> bool:
    return bool(story.get("image") and story.get("filename"))


def story_is_hero_eligible(story: dict) -> bool:
    return story.get("heroEligible", True) is not False and story_has_hero_image(story)


def add_unique_story(target: list[dict], seen: set[str], story: dict | None) -> None:
    if not story:
        return
    filename = str(story.get("filename") or "")
    if not filename or filename in seen:
        return
    seen.add(filename)
    target.append(story)


def homepage_lead_stories() -> list[dict]:
    """Build the reusable hero set.

    Manual leadOrder entries anchor the front page so article-level work does
    not unexpectedly replace the homepage lead. If no manual order exists, the
    newest image-ready stories can still seed the hero.
    """

    final: list[dict] = []
    seen: set[str] = set()
    homepage = DATA.get("homepage", {})
    lead_order = homepage.get("leadOrder", [])

    if lead_order:
        for filename in lead_order:
            add_unique_story(final, seen, STORY_BY_FILE.get(filename))
    else:
        for story in [story for story in STORIES if story_is_hero_eligible(story)][:HOME_HERO_AUTO_SEED]:
            add_unique_story(final, seen, story)


    for story in [story for story in STORIES if story_is_hero_eligible(story)]:
        add_unique_story(final, seen, story)

    for story in STORIES:
        add_unique_story(final, seen, story)

    return final[:HOME_HERO_TARGET]


def homepage_recency_stories(hero_stories: list[dict], limit: int = 15) -> list[dict]:
    hero_files = {str(story.get("filename") or "") for story in hero_stories}
    final: list[dict] = []
    seen: set[str] = set(hero_files)

    for story in homepage_recency_pool():
        add_unique_story(final, seen, story)
        if len(final) >= limit:
            break

    return final


def homepage_recency_pool() -> list[dict]:
    index_path = SITE_DIR / "content-index.json"
    if not index_path.exists():
        return STORIES

    try:
        payload = json.loads(index_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return STORIES

    index_stories = payload.get("stories")
    if not isinstance(index_stories, list):
        return STORIES

    pool: list[dict] = []
    seen: set[str] = set()
    for item in index_stories:
        if not isinstance(item, dict):
            continue
        if is_below_fold_index_item(item):
            continue
        filename = str(item.get("filename") or item.get("url") or "")
        if not filename or filename in seen:
            continue
        canonical = STORY_BY_FILE.get(filename)
        section_slug = str(
            item.get("section_slug")
            or item.get("sectionSlug")
            or (canonical or {}).get("sectionSlug")
            or ""
        ).strip().lower()
        section_name = str(item.get("section") or (canonical or {}).get("section") or "").strip().lower()
        if section_slug == "cartoons" or section_name == "cartoons":
            continue
        seen.add(filename)
        if canonical:
            pool.append(canonical)
            continue
        pool.append({
            "filename": filename,
            "title": item.get("title") or "Untitled story",
            "section": item.get("section") or "News",
            "type": item.get("type") or "Story",
            "publishedLabel": item.get("published") or item.get("publishedLabel") or "Recently published",
            "image": item.get("image") or "",
            "imageAlt": item.get("imageAlt") or item.get("title") or "Story thumbnail",
        })

    return pool or STORIES


def initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    return "".join(part[0] for part in parts[:2]).upper() or "TP"


def strip_generated_body_extras(fragment: str) -> str:
  markers = (
    '<section id="related-stories"',
    '<section class="related-block"',
    '<section class="ai-article-gallery"',
    '<section class="social-embed-panel',
  )
  end = len(fragment)
  for marker in markers:
    idx = fragment.find(marker)
    if idx != -1:
      end = min(end, idx)
  return fragment[:end].strip()


def strip_article_method_sections(fragment: str) -> str:
  patterns = (
    r'\s*<section\b[^>]*\baria-labelledby="how-to-read-this"[^>]*>.*?</section>\s*',
    r'\s*<section\b[^>]*>\s*<h2\b[^>]*\bid="how-to-read-this"[^>]*>.*?</section>\s*',
    r'\s*<div\b[^>]*class="[^"]*\batla-editor-note\b[^"]*"[^>]*>.*?</div>\s*',
    r'\s*<div\b[^>]*class="[^"]*\bcartel-editor-note\b[^"]*"[^>]*>.*?</div>\s*',
    r'\s*<section\b[^>]*class="[^"]*\bcartel-rewrite-audit\b[^"]*"[^>]*>.*?</section>\s*',
  )
  cleaned = fragment
  for pattern in patterns:
    cleaned = re.sub(pattern, "\n", cleaned, flags=re.S | re.I)
  cleaned = re.sub(r'\s+data-rewrite-passes="[^"]*"', "", cleaned, flags=re.I)
  return cleaned.strip()


def strip_summary_asides(fragment: str) -> str:
  summary_label = r"(?:Key points|Main idea)"
  patterns = (
    rf'\s*<section\b[^>]*>\s*<h[23]\b[^>]*>\s*{summary_label}\s*</h[23]>.*?</section>\s*',
    rf'\s*<section\b[^>]*>\s*<p\b[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>\s*{summary_label}\s*</p>.*?</section>\s*',
  )
  cleaned = fragment
  for pattern in patterns:
    cleaned = re.sub(pattern, "\n", cleaned, flags=re.S | re.I)
  return cleaned.strip()


def extract_balanced_div_content(page_html: str, start_tag: re.Match[str]) -> str | None:
  start = start_tag.end()
  depth = 1
  tag_pattern = re.compile(r"</?div\b[^>]*>", re.I)
  for match in tag_pattern.finditer(page_html, start):
    tag = match.group(0).lstrip().lower()
    if tag.startswith("</"):
      depth -= 1
      if depth == 0:
        return page_html[start:match.start()].strip()
    else:
      depth += 1
  return None


def extract_story_fragment(page_html: str, rel_path: str) -> str:
  if "content/asides/" in rel_path:
    pattern = re.compile(
      r'<aside class="article-aside">\s*<div class="sticky-stack">\s*(?P<content>.*?)\s*</div>\s*</aside>',
      re.S,
    )
    match = pattern.search(page_html)
    if not match:
      raise FileNotFoundError(rel_path)
    return match.group("content").strip()
  elif "content/bodies/" in rel_path:
    pattern = re.compile(
      r'<div\b[^>]*class="[^"]*\barticle-body\b[^"]*"[^>]*>',
      re.S,
    )
    match = pattern.search(page_html)
    content = extract_balanced_div_content(page_html, match) if match else None
    if not content:
      raise FileNotFoundError(rel_path)
    return strip_generated_body_extras(content)
  else:
    raise FileNotFoundError(rel_path)


def read_fragment(rel_path: str) -> str:
  fragment_path = DATA_DIR / rel_path
  if fragment_path.exists():
    fragment = fragment_path.read_text(encoding="utf-8")
    if "content/bodies/" in rel_path:
      return strip_article_method_sections(fragment)
    if "content/asides/" in rel_path:
      return strip_summary_asides(fragment)
    return fragment

  fallback_page = SITE_DIR / Path(rel_path).name
  if fallback_page.exists():
    page_html = fallback_page.read_text(encoding="utf-8")
    fragment = extract_story_fragment(page_html, rel_path)
    if "content/bodies/" in rel_path:
      return strip_article_method_sections(fragment)
    if "content/asides/" in rel_path:
      return strip_summary_asides(fragment)
    return fragment

  return fragment_path.read_text(encoding="utf-8")


def search_index_row(story: dict) -> dict:
    return {
        "title": story["title"],
        "section": story["section"],
        "type": story["type"],
        "dek": story["dek"],
        "url": story["filename"],
        "author": public_author(story.get("author")),
        "published": story["publishedLabel"],
        "publishedIso": story.get("publishedIso", ""),
        "updatedIso": story.get("updatedIso", ""),
        "image": story.get("image", ""),
        "imageAlt": public_image_alt(story, story.get("title") or "Story thumbnail"),
        "imageWidth": story.get("imageWidth"),
        "imageHeight": story.get("imageHeight"),
        "keywords": story.get("keywords", []),
    }


def compact_search_index_row(item: dict) -> dict:
    row = {
        "title": item.get("title", ""),
        "section": item.get("section", ""),
        "type": item.get("type", ""),
        "dek": item.get("dek", ""),
        "url": item.get("url", ""),
        "author": public_author(item.get("author")),
        "published": item.get("published") or item.get("publishedLabel") or "",
        "keywords": item.get("keywords") if isinstance(item.get("keywords"), list) else [],
    }
    for flag in ("newsstandOnly", "excludeFromEdition", "excludeFromArchive", "excludeFromGallery"):
        if flag in item:
            row[flag] = item[flag]
    return row


def compact_search_index_rows(items: list[dict]) -> list[dict]:
    return [compact_search_index_row(item) for item in items]


def normalize_search_item(item: dict) -> dict:
    row = dict(item)
    row["title"] = item.get("title") or item.get("headline") or ""
    row["section"] = item.get("section") or "News"
    row["type"] = item.get("type") or "Report"
    row["dek"] = item.get("dek") or item.get("summary") or ""
    row["url"] = item.get("url") or item.get("filename") or "#"
    row["author"] = public_author(item.get("author") or item.get("byline"))
    row["published"] = item.get("published") or item.get("publishedLabel") or ""
    row["publishedIso"] = item.get("publishedIso") or item.get("published_iso") or ""
    row["updatedIso"] = item.get("updatedIso") or item.get("updated_iso") or ""
    row["image"] = item.get("image") or item.get("imageUrl") or item.get("image_url") or item.get("thumbnail") or ""
    row["imageAlt"] = public_image_alt(item.get("imageAlt") or item.get("image_alt") or item.get("alt"), row["title"] or "Story thumbnail")
    if "image_alt" in row:
        row["image_alt"] = public_image_alt(row.get("image_alt"), row["title"] or "Story thumbnail")
    if "alt" in row:
        row["alt"] = public_image_alt(row.get("alt"), row["title"] or "Story thumbnail")
    if "imageCredit" in row:
        row["imageCredit"] = public_image_credit(row.get("imageCredit"))
    if "imageCreditPlain" in row:
        row["imageCreditPlain"] = public_image_credit(row.get("imageCreditPlain"))
    if "credit" in row:
        row["credit"] = public_image_credit(row.get("credit"))
    if "imageCaptionHtml" in row and FOURTH_WALL_RE.search(str(row.get("imageCaptionHtml") or "")):
        row["imageCaptionHtml"] = ""
    if "imageAiCaption" in row:
        row["imageAiCaption"] = ""
    row["imageWidth"] = item.get("imageWidth") or item.get("image_width")
    row["imageHeight"] = item.get("imageHeight") or item.get("image_height")
    row["keywords"] = item.get("keywords") if isinstance(item.get("keywords"), list) else []
    return row


def thumbnail_source_index() -> list[dict]:
    rows: list[dict] = []
    candidates = []
    for filename in ("live-index.json", "content-index.json", "edition.json"):
        for base in (DATA_DIR, SITE_DIR):
            path = base / filename
            if path not in candidates and path.exists():
                candidates.append(path)

    for path in candidates:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items = payload.get("stories") if isinstance(payload, dict) else payload
        if not isinstance(items, list):
            items = payload.get("articles") if isinstance(payload, dict) else []
        if not isinstance(items, list):
            continue
        rows.extend(normalize_search_item(item) for item in items if isinstance(item, dict) and not is_below_fold_index_item(item))

    return [row for row in rows if row["title"] and row["url"] != "#"]


def merge_search_row(primary: dict, fallback: dict) -> dict:
    merged = {**fallback, **primary}
    for field in ("image", "imageAlt", "imageWidth", "imageHeight", "publishedIso", "updatedIso", "keywords"):
        if fallback.get(field):
            merged[field] = fallback[field]
    return merged


def richer_existing_search_index() -> list[dict]:
    candidates = []
    for filename in ("search-index.json", "content-index.json"):
        for base in (DATA_DIR, SITE_DIR):
            path = base / filename
            if path not in candidates and path.exists():
                candidates.append(path)

    for path in candidates:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        rows = payload.get("stories") if isinstance(payload, dict) else payload
        if not isinstance(rows, list) or len(rows) <= len(STORIES):
            continue
        normalized = [normalize_search_item(item) for item in rows if isinstance(item, dict)]
        normalized = [item for item in normalized if item["title"] and item["url"] != "#"]
        if normalized:
            return normalized
    return []


def gallery_story_rows() -> list[dict]:
    rows: list[dict] = []

    for story in shared_archive_stories():
        image = str(story.get("image") or "")
        filename = str(story.get("filename") or "")
        if not image or not filename:
            continue
        rows.append(
            {
                "filename": filename,
                "image": preferred_image_path(image),
                "imageAlt": public_image_alt(story, story.get("title") or "Story thumbnail"),
                "title": str(story.get("title") or "Story"),
                "section": str(story.get("section") or "News"),
                "type": str(story.get("type") or "Report"),
                "publishedIso": str(story.get("publishedIso") or ""),
                "updatedIso": str(story.get("updatedIso") or ""),
                "imageWidth": story.get("imageWidth"),
                "imageHeight": story.get("imageHeight"),
            }
        )

    candidates = []
    for filename in ("content-index.json", "search-index.json"):
        for base in (DATA_DIR, SITE_DIR):
            path = base / filename
            if path not in candidates and path.exists():
                candidates.append(path)

    for path in candidates:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items = payload.get("stories") if isinstance(payload, dict) else payload
        if not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue
            if is_below_fold_index_item(item) or is_cartoon_index_item(item):
                continue
            filename = item.get("url") or item.get("filename")
            image = item.get("image") or ""
            if not filename or not image:
                continue
            if not (SITE_DIR / str(filename)).exists():
                continue
            rows.append(
                {
                    "filename": str(filename),
                    "image": preferred_image_path(str(image)),
                    "imageAlt": public_image_alt(item.get("image_alt") or item.get("imageAlt"), item.get("title") or "Story thumbnail"),
                    "title": str(item.get("title") or "Story"),
                    "section": str(item.get("section") or "News"),
                    "type": str(item.get("type") or "Report"),
                    "publishedIso": str(item.get("published_iso") or item.get("publishedIso") or ""),
                    "updatedIso": str(item.get("updated_iso") or item.get("updatedIso") or ""),
                    "imageWidth": item.get("imageWidth") or item.get("image_width"),
                    "imageHeight": item.get("imageHeight") or item.get("image_height"),
                }
            )

    # Keep one entry per article URL and preserve the newest thumbnail-backed stories first.
    unique_rows: dict[str, dict] = {}
    for row in rows:
        unique_rows.setdefault(row["filename"], row)

    def sort_key(item: dict) -> datetime:
        return (
            parse_iso_datetime(item.get("publishedIso"))
            or parse_iso_datetime(item.get("updatedIso"))
            or datetime.min
        )

    return sorted(unique_rows.values(), key=sort_key, reverse=True)


def search_index() -> list[dict]:
    master_items = [search_index_row(story) for story in STORIES]
    below_fold_items = below_fold_search_index_rows()
    existing_items = richer_existing_search_index()
    if not existing_items:
        return compact_search_index_rows(master_items + below_fold_items)

    current_below_fold_urls = {item["url"] for item in below_fold_items}
    merged = {
        item["url"]: item
        for item in existing_items
        if not is_below_fold_url(item.get("url")) or item["url"] in current_below_fold_urls
    }
    for item in thumbnail_source_index() + master_items:
        if item["url"] in merged:
            merged[item["url"]] = merge_search_row(merged[item["url"]], item)
        else:
            merged[item["url"]] = item
    for item in below_fold_items:
        merged[item["url"]] = item
    return compact_search_index_rows(list(merged.values()))


def edition_export() -> list[dict]:
    out = []
    for story in STORIES:
        out.append(
            {
                "title": story["title"],
                "url": story["filename"],
                "section": story["section"],
                "type": story["type"],
                "author": public_author(story.get("author")),
                "publishedLabel": story["publishedLabel"],
                "updatedLabel": story["updatedLabel"],
                "publishedIso": story["publishedIso"],
                "updatedIso": story["updatedIso"],
                "wordCount": story["wordCount"],
                "readTime": story["readTime"],
                "dek": story["dek"],
                "image": story["image"],
                "imageAlt": public_image_alt(story, story["title"]),
                "imageCredit": public_image_credit(story.get("imageCreditPlain")),
            }
        )
    return out


def photo_records() -> list[dict]:
    rows = []
    for story in STORIES:
        rows.append(
            {
                "story": story["title"],
                "page": story["filename"],
                "section": story["section"],
                "image": story["image"],
                "alt": public_image_alt(story, story["title"]),
                "credit": public_image_credit(story.get("imageCreditPlain")),
            }
        )
    return rows


def section_stories(section_slug: str) -> list[dict]:
    return [story for story in STORIES if story["sectionSlug"] == section_slug]


def homepage_cartoon_stories(limit: int = 4) -> list[dict]:
    cartoons = [
        story
        for story in STORIES
        if story.get("sectionSlug") == "cartoons" and story.get("filename") and story.get("image")
    ]
    return cartoons[:limit]


def related_stories(story: dict) -> list[dict]:
    related = [STORY_BY_FILE[file] for file in story.get("related", []) if file in STORY_BY_FILE and file != story["filename"]]
    if len(related) >= 3:
        return related[:3]
    same_section = [item for item in STORIES if item["sectionSlug"] == story["sectionSlug"] and item["filename"] != story["filename"]]
    for item in same_section + STORIES:
        if item["filename"] == story["filename"]:
            continue
        if item not in related:
            related.append(item)
        if len(related) == 3:
            break
    return related[:3]


def story_card(story: dict, extra_class: str = "", archive: bool = False) -> str:
    classes = "story-card"
    if extra_class:
        classes += f" {extra_class}"
    archive_attr = ' archive-card' if archive else ''
    return f"""
<article class="{classes}{archive_attr}" data-section="{h(story['section'])}" data-type="{h(story['type'])}">
  <a class="story-card__image" href="{h(story['filename'])}">
    <img src="{h(story['image'])}" alt="{h(public_image_alt(story, story['title']))}" loading="lazy" decoding="async"{f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ''}{f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ''} />
  </a>
  <div class="story-card__body">
    <p class="eyebrow eyebrow--compact">{h(story['section'])} • {h(story['type'])}</p>
    <h3 class="story-card__title"><a href="{h(story['filename'])}">{h(story['title'])}</a></h3>
    <p class="story-card__dek">{h(story['dek'])}</p>
    <p class="story-card__meta">{public_meta(story)}</p>
  </div>
</article>
""".strip()


def recency_ticker_item(story: dict, duplicate: bool = False) -> str:
    tab_attr = ' tabindex="-1"' if duplicate else ""
    media_html = (
        f"""
  <span class="home-recency-card__media">
    <img src="{h(story.get('image'))}" alt="{h(public_image_alt(story, story.get('title') or 'Story thumbnail'))}" loading="lazy" decoding="async"{f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ''}{f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ''} />
  </span>
""".rstrip()
        if story.get("image")
        else '  <span class="home-recency-card__media home-recency-card__media--empty"></span>'
    )
    return f"""
<a class="home-recency-card" href="{h(story.get('filename'))}" aria-label="{h(story.get('title'))}"{tab_attr}>
{media_html}
  <span class="home-recency-card__body">
    <span class="home-recency-card__kicker">{h(story.get('section'))} • {h(story.get('type'))}</span>
    <strong>{h(story.get('title'))}</strong>
    <span class="home-recency-card__meta">{h(story.get('publishedLabel'))}</span>
  </span>
</a>
""".strip()


def render_home_cartoons() -> str:
    cartoons = homepage_cartoon_stories()
    if not cartoons:
        return ""
    featured = cartoons[0]
    supporting = cartoons[1:4]
    supporting_markup = (
        f"""
    <div class="home-cartoons__stack">
      {"".join(story_card(story, "home-cartoons__card") for story in supporting)}
    </div>
""".rstrip()
        if supporting
        else ""
    )
    solo_class = " home-cartoons__layout--solo" if not supporting else ""
    return f"""
  <section class="home-cartoons" aria-labelledby="home-cartoons-title">
    <div class="home-cartoons__head section-heading-row">
      <div>
        <p class="eyebrow">Cartoon Desk</p>
        <h2 class="section-heading" id="home-cartoons-title">Cartoons</h2>
      </div>
      <a class="section-link" href="section-cartoons.html" data-preserve-section-link>Open cartoons</a>
    </div>
    <p class="home-cartoons__copy">Popular-topic cartoons, visual satire, and creative one-offs, whether or not they begin with a Press story.</p>
    <div class="home-cartoons__layout{solo_class}">
      {story_card(featured, "story-card--lead home-cartoons__featured")}
{supporting_markup}
    </div>
  </section>
""".strip()


BELOW_FOLD_REMOTE_DIMS = {
    "lead-collage.png": (1558, 1010),
    "new-york-city.png": (1536, 1024),
    "los-angeles.png": (1536, 1024),
    "san-francisco.png": (1536, 1024),
    "boulder.png": (1536, 1024),
    "austin.png": (1536, 1024),
    "san-diego.png": (1536, 1024),
    "atlanta.png": (1536, 1024),
    "asheville.png": (1537, 1023),
    "bend.png": (1567, 1004),
    "santa-fe.png": (1672, 941),
}

BELOW_FOLD_ARTEMIS_DIMS = {
    "artemis-ii-liftoff.jpg": (2000, 1224),
    "artemis-ii-crew.jpg": (1920, 1280),
    "artemis-ii-splashdown.jpg": (2000, 1333),
    "orion-moon-flyby.jpg": (1920, 1440),
    "lander-cabin.jpg": (2000, 1333),
    "lead-lunar-future.png": (1536, 1024),
    "roadmap-panel.png": (1536, 1024),
    "moon-base-south-pole.png": (1536, 1024),
}

BELOW_FOLD_MAKERS_DIMS = {
    "portrait-steve-jobs.jpg": (900, 900),
    "portrait-sam-altman.jpg": (900, 900),
    "portrait-elon-musk.jpg": (900, 900),
    "portrait-mark-zuckerberg.jpg": (900, 900),
    "portrait-vlad-tenev.jpg": (900, 900),
    "portrait-palmer-luckey.jpg": (900, 900),
    "portrait-jensen-huang.jpg": (900, 900),
    "makers-object-inevitable.jpg": (900, 1125),
    "makers-chip-engine.jpg": (1200, 800),
    "makers-machine-see.jpg": (900, 900),
    "makers-interface-room.jpg": (900, 900),
}


def below_fold_remote_src(image: str) -> str:
    return f"assets/below-fold/remote-work-usa/{image}"


def below_fold_image_media(image: str, alt: str, loading: str = "lazy") -> str:
    src = below_fold_remote_src(image)
    width, height = BELOW_FOLD_REMOTE_DIMS.get(image, ("", ""))
    if not (SITE_DIR / src).exists():
        return f'<span class="below-fold-image-media below-fold-image-media--missing" role="img" aria-label="{h(alt)}"></span>'
    width_attr = f' width="{width}"' if width else ""
    height_attr = f' height="{height}"' if height else ""
    return (
        f'<span class="below-fold-image-media">'
        f'<img src="{h(src)}?v={h(asset_version(src))}" alt="{h(alt)}" loading="{h(loading)}" decoding="async"'
        f'{width_attr}{height_attr} />'
        f'</span>'
    )


def below_fold_artemis_src(image: str) -> str:
    return f"assets/below-fold/artemis-future/{image}"


def below_fold_artemis_media(image: str, alt: str, loading: str = "lazy") -> str:
    src = below_fold_artemis_src(image)
    width, height = BELOW_FOLD_ARTEMIS_DIMS.get(image, ("", ""))
    if not (SITE_DIR / src).exists():
        return f'<span class="below-fold-image-media below-fold-image-media--missing" role="img" aria-label="{h(alt)}"></span>'
    width_attr = f' width="{width}"' if width else ""
    height_attr = f' height="{height}"' if height else ""
    return (
        f'<span class="below-fold-image-media">'
        f'<img src="{h(src)}?v={h(asset_version(src))}" alt="{h(alt)}" loading="{h(loading)}" decoding="async"'
        f'{width_attr}{height_attr} />'
        f'</span>'
    )


def below_fold_artemis_figure(image: str, alt: str, caption: str, class_name: str = "", loading: str = "lazy") -> str:
    classes = "below-fold-image-frame"
    if class_name:
        classes = f"{classes} {class_name}"
    return f"""
<figure class="{h(classes)}">
  {below_fold_artemis_media(image, alt, loading)}
  <figcaption>{h(caption)}</figcaption>
</figure>
""".strip()


def below_fold_image_figure(image: str, alt: str, caption: str, class_name: str = "", loading: str = "lazy") -> str:
    classes = "below-fold-image-frame"
    if class_name:
        classes = f"{classes} {class_name}"
    return f"""
<figure class="{h(classes)}">
  {below_fold_image_media(image, alt, loading)}
  <figcaption>{h(caption)}</figcaption>
</figure>
""".strip()


def below_fold_makers_src(image: str) -> str:
    return f"assets/below-fold/makers-register/{image}"


def below_fold_makers_media(image: str, alt: str, loading: str = "lazy") -> str:
    src = below_fold_makers_src(image)
    width, height = BELOW_FOLD_MAKERS_DIMS.get(image, ("", ""))
    if not (SITE_DIR / src).exists():
        return f'<span class="below-fold-image-media below-fold-image-media--missing" role="img" aria-label="{h(alt)}"></span>'
    width_attr = f' width="{width}"' if width else ""
    height_attr = f' height="{height}"' if height else ""
    return (
        f'<span class="below-fold-image-media">'
        f'<img src="{h(src)}?v={h(asset_version(src))}" alt="{h(alt)}" loading="{h(loading)}" decoding="async"'
        f'{width_attr}{height_attr} />'
        f'</span>'
    )


def below_fold_makers_figure(image: str, alt: str, caption: str, class_name: str = "", loading: str = "lazy") -> str:
    classes = "below-fold-image-frame"
    if class_name:
        classes = f"{classes} {class_name}"
    return f"""
<figure class="{h(classes)}">
  {below_fold_makers_media(image, alt, loading)}
  <figcaption>{h(caption)}</figcaption>
</figure>
""".strip()


def below_fold_place_card(place: dict, major: bool = False) -> str:
    major_class = " below-fold-place-card--major" if major else ""
    return f"""
<article class="below-fold-place-card{major_class}" data-below-fold-slot="place" data-below-fold-hook="{h(place["slug"])}">
  <figure>
    {below_fold_image_media(place["image"], place["alt"])}
    <figcaption><span>No. {place["rank"]:02d}</span>{h(place["palette"])}</figcaption>
  </figure>
  <div class="below-fold-place-card__body">
    <p class="below-fold-kicker">{h(place["label"])}</p>
    <h4>{h(place["city"])}</h4>
    <p class="below-fold-place-card__state">{h(place["state"])}</p>
    <p>{h(place["best"])}</p>
    <p class="below-fold-place-card__tradeoff">{h(place["tradeoff"])}</p>
  </div>
</article>
""".strip()


def below_fold_rank_cell(place: dict) -> str:
    return f"""
<article class="below-fold-rank-cell" data-below-fold-slot="ranking" data-below-fold-hook="rank-{h(place["slug"])}">
  <span>{place["rank"]:02d}</span>
  <h4>{h(place["city"])}</h4>
  <p>{h(place["short"])}</p>
</article>
""".strip()


def below_fold_maker_card(story: dict, number: int) -> str:
    return f"""
<article class="below-fold-makers-card" data-below-fold-slot="supporting-piece" data-below-fold-hook="{h(story["hook"])}">
  <a class="below-fold-makers-card__media" href="{h(story["href"])}" aria-label="{h(story["title"])}">
    {below_fold_makers_media(story["image"], story["alt"])}
  </a>
  <div class="below-fold-makers-card__body">
    <p class="below-fold-kicker">{h(story["kicker"])}</p>
    <div class="below-fold-makers-card__number" aria-hidden="true">{number:02d}</div>
    <h4><a href="{h(story["href"])}">{h(story["title"])}</a></h4>
    <p>{h(story["dek"])}</p>
    <span>{h(story["rubric"])}</span>
  </div>
</article>
""".strip()


def below_fold_maker_portrait(person: dict, number: int) -> str:
    return f"""
<article class="below-fold-makers-person" data-below-fold-slot="portrait-card" data-below-fold-hook="{h(person["hook"])}">
  <figure>
    {below_fold_makers_media(person["image"], person["alt"])}
    <figcaption><span>{number:02d}</span>{h(person["name"])}</figcaption>
  </figure>
  <div>
    <p class="below-fold-kicker">{h(person["label"])}</p>
    <h4>{h(person["name"])}</h4>
    <p>{h(person["copy"])}</p>
  </div>
</article>
""".strip()


def render_below_fold_makers_register(issue_month: str | None = None) -> str:
    issue_month = issue_month or BUILD_REFERENCE_DT.strftime("%B %Y")
    supporting = [
        {
            "title": "The Object Had to Feel Inevitable",
            "hook": "object-inevitable",
            "href": "section-technology.html",
            "image": "makers-object-inevitable.jpg",
            "alt": "Charcoal product-design study of abstract handheld technology forms, drafting tools, and paper margins.",
            "kicker": "Design file / Jan. 9, 2007",
            "dek": "Apple introduced iPhone as three devices at once: iPod, phone, and internet communicator. The 3.5-inch multi-touch screen made the keyboard software, not hardware; the App Store followed in 2008.",
            "rubric": "Multi-touch, App Store, glass",
        },
        {
            "title": "The Chip Became a Cultural Engine",
            "hook": "chip-cultural-engine",
            "href": "section-technology.html",
            "image": "makers-chip-engine.jpg",
            "alt": "Engraved semiconductor plate with wafer forms, circuit traces, and laboratory archive paper.",
            "kicker": "Hardware file / 1999 to CUDA",
            "dek": "Nvidia popularized the GPU in 1999; CUDA arrived in 2006 and let developers use graphics chips for general parallel computing. AI now depends on HBM, packaging, power, and datacenter cooling.",
            "rubric": "GPU, CUDA, HBM, megawatts",
        },
        {
            "title": "The Machine Learned to See",
            "hook": "machine-learned-to-see",
            "href": "section-ai.html",
            "image": "makers-machine-see.jpg",
            "alt": "Archival illustration of a camera lens, optical diagrams, sensor fragments, and an anatomical eye study.",
            "kicker": "AI file / ImageNet, 2009",
            "dek": "ImageNet organized more than 14 million labeled images; AlexNet's 2012 win made deep learning the field's new default. The same pattern now reads pallets, tumors, traffic lanes, and faces.",
            "rubric": "Datasets, labels, cameras",
        },
        {
            "title": "The Interface Became a Room We Live In",
            "hook": "interface-room",
            "href": "section-money.html",
            "image": "makers-interface-room.jpg",
            "alt": "Old-print illustration of translucent interface panes merging with room plans, desk light, and screen geometry.",
            "kicker": "Interface file / 2006-2022",
            "dek": "Facebook's News Feed launched in 2006, the App Store in 2008, Robinhood's app in 2015, ChatGPT in 2022. The interface became the market, the media channel, and the command line.",
            "rubric": "Feeds, apps, prompts",
        },
    ]
    makers = [
        {
            "name": "Steve Jobs",
            "hook": "steve-jobs",
            "image": "portrait-steve-jobs.jpg",
            "alt": "Etched portrait plate of Steve Jobs with abstract personal-computing and product-design marginalia.",
            "label": "1976 / 1984 / 2007",
            "copy": "Co-founded Apple with Steve Wozniak and Ronald Wayne on Apr. 1, 1976; Apple II shipped in 1977 and helped define the consumer microcomputer. Macintosh launched on Jan. 24, 1984 with a graphical interface and mouse as the selling point. Jobs left Apple in 1985, founded NeXT, bought Pixar's computer division from Lucasfilm in 1986, and returned when Apple acquired NeXT in 1997. The second Apple run produced iMac in 1998, iPod in 2001, iTunes Store in 2003, iPhone in 2007, App Store in 2008, and iPad in 2010.",
        },
        {
            "name": "Sam Altman",
            "hook": "sam-altman",
            "image": "portrait-sam-altman.jpg",
            "alt": "Etched portrait plate of Sam Altman with abstract AI systems, chips, and interface marginalia.",
            "label": "YC to OpenAI",
            "copy": "Led Y Combinator after 2014, became OpenAI CEO in 2019, and oversaw ChatGPT's Nov. 30, 2022 public launch. OpenAI announced a $1 billion Microsoft partnership in July 2019 to build AI systems on Azure. ChatGPT launched as a research preview connected to the GPT-3.5 line. GPT-4 followed on Mar. 14, 2023 with text and image input.",
        },
        {
            "name": "Elon Musk",
            "hook": "elon-musk",
            "image": "portrait-elon-musk.jpg",
            "alt": "Etched portrait plate of Elon Musk with abstract rocket, electric motor, battery, and orbital engineering marginalia.",
            "label": "EVs, reuse, orbit",
            "copy": "Tesla scaled Model S and Model 3; SpaceX landed Falcon 9 in 2015 and reused a booster in 2017; Starlink made orbit a broadband network. Model S customer deliveries began on June 22, 2012; Model 3 production started in July 2017. Falcon 9 landed at Landing Zone 1 on Dec. 21, 2015 after delivering 11 satellites to orbit. On Mar. 30, 2017, SpaceX achieved the first reflight of an orbital-class rocket.",
        },
        {
            "name": "Mark Zuckerberg",
            "hook": "mark-zuckerberg",
            "image": "portrait-mark-zuckerberg.jpg",
            "alt": "Etched portrait plate of Mark Zuckerberg with abstract social graph, interface grid, and immersive room-plan marginalia.",
            "label": "3.56B daily people",
            "copy": "Facebook began at Harvard in 2004; News Feed arrived in 2006; Meta reported 3.56 billion family daily active people for March 2026.",
        },
        {
            "name": "Vlad Tenev",
            "hook": "vlad-tenev",
            "image": "portrait-vlad-tenev.jpg",
            "alt": "Etched portrait plate of Vlad Tenev with abstract retail finance, chart, phone interface, and market-ledger marginalia.",
            "label": "27.6M funded customers",
            "copy": "Robinhood made zero-commission brokerage phone-native; by April 2026 it reported 27.6 million funded customers.",
        },
        {
            "name": "Palmer Luckey",
            "hook": "palmer-luckey",
            "image": "portrait-palmer-luckey.jpg",
            "alt": "Etched portrait plate of Palmer Luckey with abstract VR headset, autonomous defense sensor, drone, and command-map marginalia.",
            "label": "Oculus to Lattice",
            "copy": "Oculus sold to Facebook in 2014; Luckey co-founded Anduril in 2017, where Lattice links sensors, drones, and command software.",
        },
        {
            "name": "Jensen Huang",
            "hook": "jensen-huang",
            "image": "portrait-jensen-huang.jpg",
            "alt": "Etched portrait plate of Jensen Huang with abstract chip wafer, GPU package, circuit, and datacenter marginalia.",
            "label": "1993 / 1999 / 2006",
            "copy": "Co-founded Nvidia in 1993; the company popularized the GPU in 1999 and launched CUDA in 2006, turning graphics silicon into AI infrastructure.",
        },
    ]

    return f"""
<section class="below-fold below-fold--makers" aria-labelledby="below-fold-makers-title" data-below-fold-root data-below-fold-version="1" data-below-fold-package="makers-register">
  <div class="below-fold-folio below-fold-makers-folio" aria-label="Makers Register folio">
    <span>Technology Review</span>
    <strong>Below The Fold</strong>
    <span>Section M / Makers / {h(issue_month)}</span>
  </div>

  <header class="below-fold-header below-fold-makers-header">
    <p class="below-fold-kicker">The deep-reading file</p>
    <h2 id="below-fold-makers-title">The Makers' Register</h2>
    <p>A register of builders tied to specific turning points: Apple in 1976, Facebook in 2004, iPhone in 2007, Falcon 9 reuse in 2017, ChatGPT in 2022, and the GPU supply chain underneath it all.</p>
  </header>

  <div class="below-fold-quote below-fold-makers-quote" aria-label="Makers Register issue line">
    <span>Vol. 1 / Section M</span>
    <p>The real invention is the standard everyone else has to design around.</p>
    <span>Inventors / Designers / CEOs</span>
  </div>

  <section class="below-fold-spread below-fold-makers-lead" aria-label="Lead Makers Register feature" data-below-fold-slot="lead-feature" data-below-fold-hook="makers-register-lead">
    <article class="below-fold-lead-copy below-fold-makers-lead-copy">
      <p class="below-fold-kicker">Lead feature / Public makers</p>
      <h3>The Makers Who Designed the Present</h3>
      <p class="below-fold-dek">Seven profiles in compressed form: personal computing, social media, EVs, orbital launch, retail brokerage, defense autonomy, and accelerated computing.</p>
      <div class="below-fold-columns">
        <p>Apple's 2007 iPhone launch put phone, music player, and web browser behind one multi-touch screen. Facebook's 2006 News Feed changed the homepage from a profile directory into a ranking machine. Nvidia's CUDA gave developers a way to turn GPUs into general-purpose compute.</p>
        <p>SpaceX proved orbital-class booster reuse with Falcon 9, while Tesla made over-the-air updates part of the car business. Robinhood pushed commission-free trading onto phones and reported 27.6 million funded customers in April 2026.</p>
        <p>OpenAI's ChatGPT launch on Nov. 30, 2022 made natural language a mass interface. Anduril's Lattice shows how defense is absorbing the same software pattern: sensors, models, drones, and operators joined into one command layer.</p>
      </div>
      <a class="below-fold-makers-link" href="technology-musk-altman-openai-court-battle.html">Read the current technology file</a>
    </article>
    <div class="below-fold-makers-portraits" aria-label="Makers Register portrait ledger" data-below-fold-slot="portrait-ledger" data-below-fold-hook="makers-portrait-ledger">
      {"".join(below_fold_maker_portrait(person, index) for index, person in enumerate(makers, 1))}
    </div>
  </section>

  <section class="below-fold-spread below-fold-makers-support" aria-labelledby="below-fold-makers-support-title" data-below-fold-slot="supporting-grid">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Four files on the made world</p>
      <h3 id="below-fold-makers-support-title">Objects After the Breakthrough</h3>
    </div>
    <div class="below-fold-makers-grid">
      {"".join(below_fold_maker_card(story, index) for index, story in enumerate(supporting, 1))}
    </div>
  </section>

  <section class="below-fold-ledger below-fold-makers-ledger" aria-label="Makers Register ledger" data-below-fold-slot="ledger">
    <p><strong>Fact line:</strong> 1976 Apple, 1993 Nvidia, 2004 Facebook, 2007 iPhone, 2014 Oculus deal, 2017 Falcon 9 reflight, 2022 ChatGPT.</p>
    <p><strong>Scale line:</strong> Meta reported 3.56 billion family daily active people in March 2026; Robinhood reported 27.6 million funded customers in April 2026.</p>
    <p><strong>Slot logic:</strong> Each slot marks a standard: graphical desktop, social feed, reusable launch, prompt box, retail trading app, defense OS, GPU compute.</p>
  </section>
</section>
""".strip()


def render_below_the_fold(issue_month: str | None = None) -> str:
    places = [
        {
            "rank": 1,
            "city": "New York City",
            "state": "New York",
            "slug": "new-york-city",
            "image": "new-york-city.png",
            "label": "Capital desk",
            "palette": "Graphite, amber, electric blue",
            "best": "The subway has 472 stations; finance, publishing, fashion, galleries, universities, and ad agencies sit on the same nervous map.",
            "tradeoff": "Tradeoff: rent is brutal, but weak ties can become a lunch, panel, pitch, or gallery opening before nightfall.",
            "short": "472 subway stations plus finance, media, museums, and client density.",
            "alt": "Remote work desk by a tall New York City window with skyline lights and rain-dark reflections.",
        },
        {
            "rank": 2,
            "city": "Los Angeles",
            "state": "California",
            "slug": "los-angeles",
            "image": "los-angeles.png",
            "label": "Studio city",
            "palette": "Citrus, palm green, pool blue",
            "best": "Film studios, streaming offices, music labels, fashion houses, game teams, UCLA, USC, and LAX make LA a creative labor market with global reach.",
            "tradeoff": "Tradeoff: the 88-city county rewards people who can build a schedule around traffic, geography, and heat.",
            "short": "Studios, labels, UCLA, USC, LAX: creative work at county scale.",
            "alt": "Los Angeles outdoor patio workspace with laptop, sketchbook, palms, and sun-washed hills.",
        },
        {
            "rank": 3,
            "city": "San Francisco",
            "state": "California",
            "slug": "san-francisco",
            "image": "san-francisco.png",
            "label": "Model city",
            "palette": "Fog blue, eucalyptus, bridge red",
            "best": "OpenAI, Anthropic, Databricks, Scale AI, Salesforce, and GitHub make San Francisco the densest conversational map for AI and software work.",
            "tradeoff": "Tradeoff: the rent asks whether proximity to the frontier is worth paying for twice.",
            "short": "OpenAI, Anthropic, Databricks, Scale AI, Salesforce, GitHub.",
            "alt": "San Francisco laptop workspace by a foggy bay window with bridge forms and cool morning light.",
        },
        {
            "rank": 4,
            "city": "Boulder",
            "state": "Colorado",
            "slug": "boulder",
            "image": "boulder.png",
            "label": "Lab air",
            "palette": "Alpine green, granite, sky blue",
            "best": "CU Boulder sits beside NIST, NOAA labs, NCAR, aerospace contractors, and the Flatirons: science-town density with trailhead access.",
            "tradeoff": "Tradeoff: the mountain calm is no secret; housing prices learned the same thing.",
            "short": "CU Boulder, NIST, NOAA, NCAR, aerospace, Flatirons.",
            "alt": "Boulder cafe workspace with laptop, cycling helmet, trail map, and mountain forms outside.",
        },
        {
            "rank": 5,
            "city": "Austin",
            "state": "Texas",
            "slug": "austin",
            "image": "austin.png",
            "label": "Capital rhythm",
            "palette": "Sunset coral, teal, limestone",
            "best": "Austin combines the Texas Capitol, UT Austin, SXSW, Tesla's Gigafactory nearby, live-music infrastructure, and no state income tax.",
            "tradeoff": "Tradeoff: heat, sprawl, and growth have complicated the old easy version of the city.",
            "short": "State Capitol, UT Austin, SXSW, Tesla, live music, no income tax.",
            "alt": "Austin patio workspace with laptop, iced coffee, warm street glow, and music-culture shapes.",
        },
        {
            "rank": 6,
            "city": "San Diego",
            "state": "California",
            "slug": "san-diego",
            "image": "san-diego.png",
            "label": "Blue lab",
            "palette": "Ocean cyan, sand, kelp green",
            "best": "UC San Diego, the Salk Institute, Qualcomm, biotech clusters, and one of America's largest naval concentrations sit beside the coast.",
            "tradeoff": "Tradeoff: paradise still invoices like coastal California.",
            "short": "UCSD, Salk, Qualcomm, biotech, Navy, and surf-light discipline.",
            "alt": "San Diego coastal laptop workspace with coffee, surfboard, and ocean horizon.",
        },
        {
            "rank": 7,
            "city": "Atlanta",
            "state": "Georgia",
            "slug": "atlanta",
            "image": "atlanta.png",
            "label": "Airport city",
            "palette": "Emerald, gold, brick red",
            "best": "Hartsfield-Jackson has long ranked among the world's busiest airports; Atlanta adds Georgia Tech, CDC, film production, logistics, and corporate HQs.",
            "tradeoff": "Tradeoff: sprawl makes neighborhood choice the difference between fluid and exhausting.",
            "short": "Hartsfield-Jackson, Georgia Tech, CDC, film, logistics, HQs.",
            "alt": "Atlanta coworking lounge with laptop, plants, skyline silhouette, and transit cues.",
        },
        {
            "rank": 8,
            "city": "Asheville",
            "state": "North Carolina",
            "slug": "asheville",
            "image": "asheville.png",
            "label": "Arts ridge",
            "palette": "Misty blue, moss, clay",
            "best": "The River Arts District gathers hundreds of working artists along the French Broad River; the Blue Ridge Parkway keeps the city tied to the mountains.",
            "tradeoff": "Tradeoff: the small-market dream now carries big-market housing pressure.",
            "short": "River Arts District, French Broad River, Blue Ridge Parkway.",
            "alt": "Asheville artsy mountain cafe workspace with laptop, ceramic mug, sketchbook, and Blue Ridge view.",
        },
        {
            "rank": 9,
            "city": "Bend",
            "state": "Oregon",
            "slug": "bend",
            "image": "bend.png",
            "label": "Trail economy",
            "palette": "Pine, slate, river teal",
            "best": "The Deschutes River runs through town, Mount Bachelor anchors ski season, and the outdoor economy turns trail access into scheduling logic.",
            "tradeoff": "Tradeoff: amenity towns attract amenity-town prices and real infrastructure strain.",
            "short": "Deschutes River, Mount Bachelor, trails, resort pressure, focus.",
            "alt": "Bend Oregon remote work table with laptop, thermos, trail shoes, forest, and volcanic mountain silhouette.",
        },
        {
            "rank": 10,
            "city": "Santa Fe",
            "state": "New Mexico",
            "slug": "santa-fe",
            "image": "santa-fe.png",
            "label": "Museum quiet",
            "palette": "Adobe, turquoise, sage",
            "best": "Founded in 1610, Santa Fe is the nation's oldest capital city; galleries, museums, adobe streets, and Los Alamos nearby give quiet real intellectual weight.",
            "tradeoff": "Tradeoff: quiet can become isolation if your work needs daily collision.",
            "short": "Founded 1610, oldest U.S. capital, galleries, Los Alamos nearby.",
            "alt": "Santa Fe adobe courtyard remote-work desk with laptop, ceramic cup, sketchbook, desert plants, and distant mesas.",
        },
    ]
    big_three = places[:3]
    regional_files = places[3:]
    issue_month = issue_month or BUILD_REFERENCE_DT.strftime("%B %Y")
    lead_caption = "The list favors places where actual infrastructure changes the day: transit stations, airports, campuses, labs, studios, rivers, mountains, and museums."
    remote_signal_bars = [
        ("Network", 90, "Measured by named anchors: OpenAI in SF, studios in LA, Wall Street in NYC, CDC and Georgia Tech in Atlanta."),
        ("Rooms", 82, "Third places with actual utility: libraries, campuses, hotel lobbies, coworking rooms, museum cafes, and transit-adjacent desks."),
        ("Texture", 76, "Friction counted too: LA traffic, Austin heat, SF rent, Atlanta sprawl, Bend housing strain, Santa Fe isolation."),
        ("Payoff", 88, "The off-clock facts: Broadway, beaches, SXSW, Blue Ridge trails, Mount Bachelor, Canyon Road, and museum density."),
    ]
    remote_daybook = [
        ("Morning", "Best first-call cities have infrastructure: NYC subway access, SF tech corridors, Atlanta airport reach, campus towns with public rooms."),
        ("Midday", "A useful remote base lets you move without blowing the day: subway, beach path, bike lane, campus walk, trailhead, or river route."),
        ("Night", "The strongest places have a second shift: Broadway, Hollywood, live music, galleries, trails, ski runs, desert museums, or founder rooms."),
    ]

    return f"""
<section class="below-fold below-fold--remote" aria-labelledby="below-fold-title" data-below-fold-root data-below-fold-version="2" data-below-fold-package="remote-work-usa">
  <div class="below-fold-folio" aria-label="Below the Fold folio">
    <span>Remote Work USA</span>
    <strong>The Remote Work List</strong>
    <span>Pages B1-B10 / {h(issue_month)}</span>
  </div>

  <header class="below-fold-header">
    <p class="below-fold-kicker">Ranked travel guide</p>
    <h2 id="below-fold-title">The Remote Work List</h2>
    <p>Ten places ranked by factual work infrastructure: transit, airports, universities, labs, studios, employers, cultural institutions, outdoor access, and real tradeoffs.</p>
  </header>

  <div class="below-fold-quote" aria-label="Below the Fold issue line">
    <span>Vol. 1 / Section B</span>
    <p>Cheap rent is not the list. Useful infrastructure is the list.</p>
    <span>Top 10 USA</span>
  </div>

  <section class="below-fold-spread below-fold-spread--lead" aria-label="Lead remote-work ranking" data-below-fold-slot="lead-feature" data-below-fold-hook="remote-work-lead">
    <article class="below-fold-lead-copy">
      <p class="below-fold-kicker">Lead ranking / Work from anywhere</p>
      <h3>The 10 Coolest Places to Work Remote in the USA</h3>
      <p class="below-fold-dek">A ranked guide built from hard anchors: 472 subway stations, LAX and ATL, OpenAI and Anthropic, CU Boulder labs, UCSD biotech, River Arts studios, Mount Bachelor, Santa Fe's 1610 civic history.</p>
      <div class="below-fold-columns">
        <p>New York wins on compression: 472 subway stations, finance, media, museums, publishing, fashion, and clients inside one transit field. Los Angeles wins on creative supply chain: studios, streaming, music, design, UCLA, USC, and LAX.</p>
        <p>San Francisco remains the AI room because OpenAI, Anthropic, Databricks, Scale AI, GitHub, and Salesforce keep the software conversation physically close. Boulder is not just pretty; CU Boulder, NIST, NOAA, NCAR, and aerospace contractors make it a lab town.</p>
        <p>The rest are specific: Austin has the Capitol, UT, SXSW, Tesla, and no state income tax; San Diego has UCSD, Salk, Qualcomm, biotech, and Navy depth; Atlanta has ATL, Georgia Tech, CDC, film, and logistics; Asheville, Bend, and Santa Fe carry art, trails, and history.</p>
      </div>
    </article>
    {below_fold_image_figure("lead-collage.png", "Editorial collage of remote work scenes across the United States.", lead_caption, "below-fold-lead-art", "eager")}
    <aside class="below-fold-index" data-below-fold-slot="index" data-below-fold-hook="remote-work-index">
      <h4>Inside The List</h4>
      <dl>
        {"".join(f'<div><dt>{place["rank"]:02d}</dt><dd>{h(place["city"])}</dd></div>' for place in places)}
      </dl>
    </aside>
    <aside class="below-fold-remote-field-notes" aria-label="Remote work ranking field notes" data-below-fold-slot="field-notes" data-below-fold-hook="remote-work-field-index">
      <div class="below-fold-remote-compass">
        <p class="below-fold-kicker">Field index</p>
        <h4>The Cool Factor Is a Workday System</h4>
        <p>We ranked named infrastructure: universities, airports, transit, employers, labs, cultural districts, parks, trails, and the cost or sprawl that comes with them.</p>
        <div class="below-fold-remote-compass__stamp" aria-hidden="true">
          <span>Not cheapest</span>
          <strong>Coolest</strong>
          <span>Most alive</span>
        </div>
      </div>
      <div class="below-fold-remote-signal-stack" aria-label="Remote-work signal index">
        {"".join(f'<article class="below-fold-remote-signal" style="--signal:{h(str(score))}%"><div><span>{h(label)}</span><strong>{score}</strong></div><div class="below-fold-remote-signal__bar" aria-hidden="true"><i></i></div><p>{h(copy)}</p></article>' for label, score, copy in remote_signal_bars)}
      </div>
      <div class="below-fold-remote-daybook">
        <div class="below-fold-remote-route-rule" aria-hidden="true">
          <span>Desk</span>
          <i></i>
          <span>City</span>
          <i></i>
          <span>After-hours</span>
        </div>
        {"".join(f'<article><p>{h(label)}</p><h4>{h(copy)}</h4></article>' for label, copy in remote_daybook)}
      </div>
    </aside>
  </section>

  <section class="below-fold-spread below-fold-spread--big-three" aria-labelledby="below-fold-big-three-title" data-below-fold-slot="big-three">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">The big three</p>
      <h3 id="below-fold-big-three-title">Culture, Capital, Gravity</h3>
    </div>
    <div class="below-fold-big-three-grid">
      {"".join(below_fold_place_card(place, True) for place in big_three)}
    </div>
  </section>

  <section class="below-fold-spread below-fold-spread--ranking" aria-labelledby="below-fold-ranking-title" data-below-fold-slot="ranking-grid">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Full ranking</p>
      <h3 id="below-fold-ranking-title">The Top 10 Desk Map</h3>
    </div>
    <div class="below-fold-ranking-grid">
      {"".join(below_fold_rank_cell(place) for place in places)}
    </div>
  </section>

  <section class="below-fold-spread below-fold-spread--regional" aria-labelledby="below-fold-regional-title" data-below-fold-slot="regional-files">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Regional files</p>
      <h3 id="below-fold-regional-title">Seven Ways to Leave the Headquarters</h3>
    </div>
    <div class="below-fold-regional-grid">
      {"".join(below_fold_place_card(place) for place in regional_files)}
    </div>
  </section>

  <section class="below-fold-spread below-fold-spread--service" aria-labelledby="below-fold-service-title" data-below-fold-slot="field-notes">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Field notes</p>
      <h3 id="below-fold-service-title">How We Read The Workday</h3>
    </div>
    <div class="below-fold-service-grid">
      <article class="below-fold-service-panel below-fold-service-panel--wide">
        <p class="below-fold-kicker">Tradeoffs</p>
        <h4>Cool is not the same as easy</h4>
        <p>NYC, LA, and San Francisco rank high because their institutions are dense, not because they are easy. Boulder, Bend, Asheville, and Santa Fe rank because labs, trails, art districts, and museums change what closing the laptop means.</p>
      </article>
      <article class="below-fold-service-panel">
        <p class="below-fold-kicker">Scorecard</p>
        <h4>What counted</h4>
        <ul>
          <li>Network density</li>
          <li>Named institutions</li>
          <li>Transit or airport reach</li>
          <li>Universities and labs</li>
          <li>Cost and sprawl pressure</li>
        </ul>
      </article>
      <article class="below-fold-service-panel">
        <p class="below-fold-kicker">Packing list</p>
        <h4>What changes by city</h4>
        <ul>
          <li>MetroCard logic in NYC</li>
          <li>Car math in LA</li>
          <li>Rent math in SF</li>
          <li>Heat math in Austin</li>
          <li>Trail timing in Bend</li>
        </ul>
      </article>
    </div>
  </section>

  <section class="below-fold-ledger" aria-label="Remote work ledger" data-below-fold-slot="ledger">
    <p><strong>Method:</strong> Ranked by named anchors: transit stations, airports, universities, labs, employers, cultural districts, trails, and usable third places.</p>
    <p><strong>Caveat:</strong> NYC, LA, and SF stay expensive for a reason; the list penalizes cost, but does not pretend cost erases access.</p>
    <p><strong>Desk note:</strong> A city rises when the facts around the laptop are better than the room the laptop sits in.</p>
  </section>
</section>
""".strip()


def render_below_fold_artemis(issue_month: str | None = None) -> str:
    issue_month = issue_month or BUILD_REFERENCE_DT.strftime("%B %Y")
    crew = [
        ("Commander", "Reid Wiseman", "Wiseman flew 165 days on the ISS in 2014 and later served as NASA chief astronaut; Artemis II put that station discipline into deep-space command."),
        ("Pilot", "Victor Glover", "Glover piloted SpaceX Crew-1 in 2020 and spent 167 days on the ISS; on Artemis II he helped prove Orion as a crewed cockpit."),
        ("Mission specialist", "Christina Koch", "Koch logged 328 continuous days in space and joined the first all-woman spacewalk; Artemis II turned that endurance into lunar test work."),
        ("Mission specialist", "Jeremy Hansen", "Hansen, a Canadian Space Agency astronaut and former fighter pilot, became the first Canadian assigned to a lunar mission."),
    ]
    roadmap = [
        ("Artemis II", "April 2026", "NASA lists the mission at 9 days, 1 hour, 32 minutes: launch, lunar flyby, reentry, splashdown, and recovery with four people aboard."),
        ("Artemis III", "Target: 2027", "NASA describes the next test as low-Earth-orbit rendezvous and docking between Orion and commercial spacecraft from SpaceX and/or Blue Origin."),
        ("Artemis IV", "Target: early 2028", "NASA's surface-return plan sends two crew members near the lunar South Pole for about a week before rejoining Orion in lunar orbit."),
        ("Artemis V", "Target: late 2028", "The next surface campaign is about logistics: cargo, mobility, tools, power, communications, and enough repetition to learn from failure."),
        ("Mars", "Long horizon", "Moon-to-Mars planning uses the lunar campaign to test autonomy, repair, radiation discipline, crew health, and supply chains far from Earth."),
    ]
    hardware = [
        ("Orion", "Orion is the crew cabin, service module, launch-abort stack, heat shield, parachute system, and ocean-return spacecraft in one architecture."),
        ("SLS", "NASA's Space Launch System stands 322 feet tall in Block 1 form and produces about 8.8 million pounds of thrust at liftoff."),
        ("Commercial landers", "SpaceX Starship HLS and Blue Origin Blue Moon Mark 2 make Artemis a docking-and-transfer problem, not only a launch problem."),
        ("Spacesuits", "A lunar suit must handle dust, cooling, oxygen, communications, gloves, boots, tool use, and hours of walking in one-sixth gravity."),
        ("Heat shield", "Orion's Avcoat heat shield is roughly 16.5 feet across, the part that has to survive lunar-return reentry before parachutes matter."),
        ("Mission control", "Artemis now ties Johnson, Kennedy, recovery forces, ESA's service module, commercial landers, suit teams, and science planners into one clock."),
    ]
    mission_notes = [
        ("9d 1h 32m", "NASA lists Artemis II at 9 days, 1 hour, 32 minutes, with four astronauts testing Orion, SLS, recovery, and deep-space operations."),
        ("40 minutes quiet", "Behind the Moon, radio silence forced Orion and crew outside direct Earth contact; autonomy becomes practical during loss of signal."),
        ("30 targets", "Before the flyby, science teams refined a lunar target list, including Orientale basin features near the Moon's far-side edge."),
        ("7,000+ images", "The crew returned thousands of frames: terrain, earthrise, earthset, eclipse geometry, stars, and the procedural evidence future crews will study."),
        ("Impact flashes", "The astronauts watched for meteoroid flashes on the Moon's night side, proof that even a dead-looking world is still being edited."),
        ("Pericynthion", "Closest approach has a beautiful technical name: pericynthion. Artemis II's came about 4,067 miles above the lunar surface."),
    ]

    return f"""
<section class="below-fold below-fold--artemis" aria-labelledby="below-fold-artemis-title" data-below-fold-root data-below-fold-version="1" data-below-fold-package="artemis-future">
  <div class="below-fold-folio" aria-label="Artemis Dispatch folio">
    <span>Artemis Dispatch</span>
    <strong>Moon Work</strong>
    <span>Section C / Moon to Mars / {h(issue_month)}</span>
  </div>

  <header class="below-fold-header below-fold-artemis-header">
    <p class="below-fold-kicker">Science desk / Moon campaign</p>
    <h2 id="below-fold-artemis-title">After the Moonshot, the Moon Work Begins</h2>
    <p>Artemis II was NASA's first crewed lunar flyby in more than 50 years: 9 days, 1 hour, 32 minutes; four astronauts; SLS from Pad 39B; Orion around the Moon; Pacific recovery on April 10, 2026.</p>
  </header>

  <div class="below-fold-quote below-fold-artemis-quote" aria-label="Artemis issue line">
    <span>Vol. 1 / Section C</span>
    <p>The hard part after the flyby is docking Orion to commercial landers, then surviving a week of useful work near the lunar South Pole.</p>
    <span>Moon to Mars</span>
  </div>

  <section class="below-fold-spread below-fold-spread--lead below-fold-artemis-lead" aria-label="Lead Artemis feature" data-below-fold-slot="lead-feature" data-below-fold-hook="artemis-lead">
    <article class="below-fold-lead-copy">
      <p class="below-fold-kicker">Lead feature / Deep-space return</p>
      <h3>Artemis II Turned the Moon Back Into a Destination</h3>
      <p class="below-fold-dek">Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen launched April 1, splashed down April 10, and pushed Orion through the first crewed Artemis lunar test.</p>
      <div class="below-fold-columns">
        <p>The mission ledger is concrete: launch from Kennedy Space Center, 9 days 1 hour 32 minutes in flight, farthest distance 252,756 miles from Earth, closest lunar approach about 4,067 miles above the surface, splashdown in the Pacific.</p>
        <p>The operational tests were the real article: Orion displays, manual handling, life support, exercise, emergency gear, suit behavior, communications loss behind the Moon, reentry heating, parachutes, and Navy-led recovery.</p>
        <p>Artemis III is not a landing; NASA says it will test rendezvous and docking in low Earth orbit with commercial spacecraft. Artemis IV is the planned surface return, sending two astronauts near the South Pole for roughly a week.</p>
      </div>
    </article>
    {below_fold_artemis_figure("lead-lunar-future.png", "Editorial collage of Artemis lunar infrastructure, Orion-like spacecraft, mission control, and a distant Mars horizon.", "Artemis is now a systems problem: Orion, SLS, commercial landers, suits, power, comms, recovery ships, and Mars planning.", "below-fold-lead-art below-fold-artemis-lead-art", "eager")}
    <aside class="below-fold-index below-fold-artemis-index" data-below-fold-slot="index" data-below-fold-hook="artemis-index">
      <h4>Mission Ledger</h4>
      <dl>
        <div><dt>Launch</dt><dd>April 1, 2026</dd></div>
        <div><dt>Return</dt><dd>April 10, 2026</dd></div>
        <div><dt>Farthest</dt><dd>252,756 miles</dd></div>
        <div><dt>Flyby</dt><dd>4,067 miles above the Moon</dd></div>
        <div><dt>Next</dt><dd>Earth-orbit docking test</dd></div>
      </dl>
    </aside>
    <aside class="below-fold-artemis-science-notes" aria-label="Artemis flyby science notes" data-below-fold-slot="science-notes" data-below-fold-hook="artemis-flyby-facts">
      <div class="below-fold-artemis-orbit-rule" aria-hidden="true">
        <span>Earth</span>
        <i></i>
        <span>Moon</span>
        <i></i>
        <span>Return</span>
      </div>
      <div class="below-fold-artemis-note-grid">
        {"".join(f'<article class="below-fold-artemis-note"><p>{h(label)}</p><h4>{h(copy)}</h4></article>' for label, copy in mission_notes)}
      </div>
    </aside>
  </section>

  <section class="below-fold-spread below-fold-artemis-photo-led" aria-labelledby="below-fold-artemis-photo-title" data-below-fold-slot="photo-desk">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Photo desk</p>
      <h3 id="below-fold-artemis-photo-title">The Flight in Four Frames</h3>
    </div>
    <div class="below-fold-artemis-photo-grid">
      {below_fold_artemis_figure("artemis-ii-liftoff.jpg", "NASA SLS rocket lifting off with Artemis II from Kennedy Space Center.", "SLS lifted off from Pad 39B on April 1, 2026, the first crewed lunar launch from Kennedy in more than half a century.")}
      {below_fold_artemis_figure("artemis-ii-crew.jpg", "The Artemis II crew in orange launch and entry suits on the crew access arm.", "The crew combined ISS time, Navy test-pilot discipline, CSA partnership, and long-duration human-spaceflight experience.")}
      {below_fold_artemis_figure("orion-moon-flyby.jpg", "The Moon seen from Orion during Artemis II.", "Orion's lunar pass supplied navigation, camera, comms-loss, and crew-observation data for later docking and landing missions.")}
      {below_fold_artemis_figure("artemis-ii-splashdown.jpg", "Orion splashing down in the Pacific Ocean under parachutes.", "Splashdown on April 10 tested the full return chain: heat shield, parachutes, beaconing, recovery crews, and post-flight inspection.")}
    </div>
  </section>

  <section class="below-fold-spread below-fold-artemis-crew" aria-labelledby="below-fold-artemis-crew-title" data-below-fold-slot="crew-room">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Crew room</p>
      <h3 id="below-fold-artemis-crew-title">Four Names in the Loop</h3>
    </div>
    <div class="below-fold-artemis-crew-grid">
      {"".join(f'<article class="below-fold-artemis-crew-card" data-below-fold-slot="crew" data-below-fold-hook="{h(name.lower().replace(" ", "-"))}"><p class="below-fold-kicker">{h(role)}</p><h4>{h(name)}</h4><p>{h(copy)}</p></article>' for role, name, copy in crew)}
    </div>
  </section>

  <section class="below-fold-spread below-fold-artemis-roadmap" aria-labelledby="below-fold-artemis-roadmap-title" data-below-fold-slot="roadmap">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Roadmap</p>
      <h3 id="below-fold-artemis-roadmap-title">From Flyby to Foothold</h3>
    </div>
    <div class="below-fold-artemis-roadmap-grid">
      {below_fold_artemis_figure("roadmap-panel.png", "Editorial technical roadmap panel showing Artemis II, Artemis III, Artemis IV, Artemis V, and Mars as linked mission beats.", "The roadmap moves from flyby to low-Earth-orbit docking, then to a South Pole landing and the logistics needed for Mars.", "below-fold-artemis-roadmap-art")}
      <div class="below-fold-artemis-timeline">
        {"".join(f'<article class="below-fold-artemis-timeline-card"><span>{h(label)}</span><h4>{h(date)}</h4><p>{h(copy)}</p></article>' for label, date, copy in roadmap)}
      </div>
    </div>
  </section>

  <section class="below-fold-spread below-fold-artemis-hardware" aria-labelledby="below-fold-artemis-hardware-title" data-below-fold-slot="hardware-desk">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Hardware desk</p>
      <h3 id="below-fold-artemis-hardware-title">The Machines Still Have to Agree</h3>
    </div>
    <div class="below-fold-artemis-hardware-layout">
      {below_fold_artemis_figure("lander-cabin.jpg", "Blue Origin Blue Moon Mark 2 crew cabin trainer inside NASA Johnson Space Center.", "Blue Origin's Blue Moon Mark 2 trainer lets crews rehearse the cabin geometry before a real lander ever reaches lunar orbit.")}
      <div class="below-fold-dispatch-grid below-fold-artemis-hardware-grid">
        {"".join(f'<article class="below-fold-brief" data-below-fold-slot="hardware" data-below-fold-hook="{h(title.lower().replace(" ", "-"))}"><p class="below-fold-kicker">System</p><h4>{h(title)}</h4><p>{h(copy)}</p></article>' for title, copy in hardware)}
      </div>
    </div>
  </section>

  <section class="below-fold-spread below-fold-artemis-risk" aria-labelledby="below-fold-artemis-risk-title" data-below-fold-slot="risk-ledger">
    <div class="below-fold-section-head">
      <p class="below-fold-kicker">Risk ledger</p>
      <h3 id="below-fold-artemis-risk-title">The Hard Parts Are the Story</h3>
    </div>
    <div class="below-fold-service-grid below-fold-artemis-risk-grid">
      <article class="below-fold-service-panel below-fold-service-panel--wide">
        <p class="below-fold-kicker">Surface return</p>
        <h4>Lander readiness decides the pace</h4>
        <p>NASA now puts rendezvous and docking before the surface return. The landing depends on Orion meeting a commercial lander, crew transfer, suit readiness, and a clean path back to Earth.</p>
      </article>
      <article class="below-fold-service-panel">
        <p class="below-fold-kicker">Watch list</p>
        <h4>What must work</h4>
        <ul>
          <li>Orion-to-lander docking</li>
          <li>Suit and cabin interfaces</li>
          <li>Heat shield margins</li>
          <li>Mission-control handoffs</li>
          <li>Surface power and comms</li>
        </ul>
      </article>
      <article class="below-fold-service-panel">
        <p class="below-fold-kicker">Moon base</p>
        <h4>From sortie to system</h4>
        <p>The late-decade surface campaign becomes real only when cargo, tools, communications, power, rovers, suits, and dust-tolerant procedures survive beyond a single flag-and-photo visit.</p>
      </article>
    </div>
  </section>

  <section class="below-fold-spread below-fold-artemis-surface" aria-label="Lunar surface future" data-below-fold-slot="surface-future">
    {below_fold_artemis_figure("moon-base-south-pole.png", "Generated editorial image of a restrained future Artemis lunar south pole worksite with habitats, rover tracks, astronauts, and instruments.", "A credible first lunar worksite is mostly unglamorous: power cables, dust control, suit checks, comms, sample tools, rover tracks, and shelter.", "below-fold-artemis-surface-art")}
  </section>

  <section class="below-fold-ledger" aria-label="Artemis source ledger" data-below-fold-slot="ledger">
    <p><strong>Mission note:</strong> Artemis II: April 1-10, 2026; 9 days, 1 hour, 32 minutes; farthest distance 252,756 miles; closest lunar pass about 4,067 miles.</p>
    <p><strong>Hardware note:</strong> SLS Block 1 is 322 feet tall with about 8.8 million pounds of thrust; Orion returns under parachutes after lunar-speed reentry.</p>
    <p><strong>Desk note:</strong> The next named problem is docking: Orion plus commercial lander plus suits plus crew transfer before anyone works near the South Pole.</p>
  </section>
</section>
""".strip()


def below_fold_issue_number_label(issue: dict) -> str:
    try:
        return f"Issue {int(issue.get('issueNumber') or 0):02d}"
    except (TypeError, ValueError):
        return "Issue"


def below_fold_issue_thumbnail(issue: dict, loading: str = "lazy") -> str:
    src = str(issue.get("thumbnail") or "").strip()
    alt = str(issue.get("imageAlt") or issue.get("title") or "Below the Fold issue").strip()
    width = issue.get("thumbnailWidth")
    height = issue.get("thumbnailHeight")
    if src:
        remote = bool(re.match(r"^[a-z][a-z0-9+.-]*:", src, re.I))
        if remote or (SITE_DIR / src).exists():
            width_attr = f' width="{h(width)}"' if width else ""
            height_attr = f' height="{h(height)}"' if height else ""
            return (
                f'<img src="{h(versioned_asset_url(src))}" alt="{h(alt)}" loading="{h(loading)}" '
                f'decoding="async"{width_attr}{height_attr} />'
            )
    return f'<span class="below-fold-issue-card__image-missing" role="img" aria-label="{h(alt)}"></span>'


def below_fold_issue_card(issue: dict, extra_class: str = "", loading: str = "lazy") -> str:
    classes = "below-fold-issue-card"
    if extra_class:
        classes = f"{classes} {extra_class}"
    title = str(issue.get("title") or "Below the Fold").strip()
    dek = str(issue.get("dek") or "").strip()
    date = str(issue.get("dateLabel") or "").strip()
    rubric = str(issue.get("rubric") or "Below the Fold").strip()
    section_label = str(issue.get("sectionLabel") or "The Newsstand").strip()
    meta_bits = [below_fold_issue_number_label(issue), date]
    meta = " / ".join(bit for bit in meta_bits if bit)
    return f"""
<article class="{h(classes)}">
  <a class="below-fold-issue-card__link" href="{h(issue['url'])}" aria-label="Read {h(title)}">
    <figure class="below-fold-issue-card__media">
      {below_fold_issue_thumbnail(issue, loading)}
    </figure>
    <div class="below-fold-issue-card__body">
      <p class="below-fold-issue-card__meta">{h(meta)}</p>
      <h3>{h(title)}</h3>
      <p>{h(dek)}</p>
      <span class="below-fold-issue-card__rubric">{h(rubric)} / {h(section_label)}</span>
    </div>
  </a>
</article>
""".strip()


BELOW_FOLD_RENDERERS = {
    "artemis-future": render_below_fold_artemis,
    "remote-work-usa": render_below_the_fold,
    "makers-register": render_below_fold_makers_register,
}


def render_below_fold_issue_body(issue: dict) -> str:
    renderer = str(issue.get("renderer") or "").strip()
    issue_month = str(issue.get("dateLabel") or "").strip() or None
    if renderer:
        render = BELOW_FOLD_RENDERERS.get(renderer)
        if render is None:
            raise ValueError(
                f"{BELOW_FOLD_REGISTRY_PATH}: issue {issue.get('slug')!r} uses unknown renderer {renderer!r}; "
                "add it to BELOW_FOLD_RENDERERS or use bodyFile"
            )
        return render(issue_month)
    body_file = str(issue.get("bodyFile") or "").strip()
    if body_file:
        fragment = read_fragment(body_file).strip()
        if "data-below-fold-package=" in fragment:
            return fragment
        return f"""
<section class="below-fold below-fold--plain" aria-labelledby="below-fold-{h(issue['slug'])}-title" data-below-fold-root data-below-fold-package="{h(issue['slug'])}">
  <header class="below-fold-header">
    <p class="below-fold-kicker">{h(issue.get('kicker') or 'Below the Fold')}</p>
    <h2 id="below-fold-{h(issue['slug'])}-title">{h(issue.get('title') or 'Below the Fold')}</h2>
    <p>{h(issue.get('dek') or '')}</p>
  </header>
  <div class="below-fold-plain-body">
    {fragment}
  </div>
</section>
""".strip()
    raise ValueError(f"{BELOW_FOLD_REGISTRY_PATH}: issue {issue.get('slug')!r} needs a renderer or bodyFile")


def render_home_below_fold_newsstand() -> str:
    issues = below_fold_issues_newest()
    latest = issues[0] if issues else None
    if not latest:
        return ""
    back_issues = [issue for issue in issues if issue["slug"] != latest["slug"]][:6]
    back_cards = "\n".join(below_fold_issue_card(issue) for issue in back_issues)
    issue_payload = [
        {
            "slug": issue["slug"],
            "title": issue.get("title") or "Below the Fold",
            "url": issue["url"],
            "issueLabel": below_fold_issue_number_label(issue),
            "dateLabel": issue.get("dateLabel") or "",
            "dek": issue.get("dek") or "",
            "rubric": issue.get("rubric") or "",
            "sectionLabel": issue.get("sectionLabel") or "",
        }
        for issue in issues
    ]
    issue_templates = {issue["slug"]: render_below_fold_issue_body(issue) for issue in issues}
    issue_deck = json.dumps(
        {"current": latest["slug"], "issues": issue_payload, "templates": issue_templates},
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")
    older_issue = issues[1] if len(issues) > 1 else None

    def turn_control(kind: str, issue: dict | None) -> str:
        is_older = kind == "older"
        label = "Older issue" if is_older else "Newer issue"
        arrow = "&rsaquo;" if is_older else "&lsaquo;"
        disabled_class = "" if issue else " is-disabled"
        disabled_attrs = "" if issue else ' aria-disabled="true" tabindex="-1"'
        href = issue["url"] if issue else "#"
        title = issue.get("title") if issue else ("Oldest issue" if is_older else "Newest issue")
        meta = (
            " / ".join(bit for bit in [below_fold_issue_number_label(issue), str(issue.get("dateLabel") or "").strip()] if bit)
            if issue
            else ("No older issue" if is_older else "You are on the newest issue")
        )
        aria_label = (
            f"Flip to {'older' if is_older else 'newer'} issue: {title}"
            if issue
            else ("No older Below the Fold issue" if is_older else "You are on the newest Below the Fold issue")
        )
        return f"""
      <a class="below-fold-flipper__turn below-fold-flipper__turn--{kind}{disabled_class}" href="{h(href)}" data-below-fold-flip="{kind}" aria-label="{h(aria_label)}"{disabled_attrs}>
        <span class="below-fold-flipper__arrow" aria-hidden="true">{arrow}</span>
        <span class="below-fold-flipper__turn-label">{h(label)}</span>
        <strong data-below-fold-turn-title>{h(title)}</strong>
        <small data-below-fold-turn-meta>{h(meta)}</small>
      </a>
""".rstrip()

    latest_meta = " / ".join(
        bit for bit in [below_fold_issue_number_label(latest), str(latest.get("dateLabel") or "").strip()] if bit
    )
    flipper = f"""
  <section class="below-fold-flipper" data-below-fold-flipper data-current-slug="{h(latest['slug'])}" aria-labelledby="below-fold-flipper-title">
    <div class="below-fold-flipper__toolbar">
      <div>
        <p class="below-fold-kicker">Below the Fold stack</p>
        <h2 id="below-fold-flipper-title">Issues</h2>
      </div>
      <div class="below-fold-flipper__status">
        <span data-below-fold-counter>{h(latest_meta)}</span>
        <a href="{h(BELOW_FOLD_NEWSSTAND_URL)}">Browse the Below the Fold stack archive</a>
      </div>
    </div>
    <div class="below-fold-flipper__stage" data-below-fold-stage>
{turn_control("older", older_issue)}
      <div class="below-fold-flipper__paper" data-below-fold-paper aria-live="polite" aria-atomic="true">
        <div class="below-fold-flipper__sheet" data-below-fold-sheet>
          {issue_templates[latest["slug"]]}
        </div>
      </div>
{turn_control("newer", None)}
    </div>
    <script type="application/json" data-below-fold-issue-deck>{issue_deck}</script>
  </section>
""".rstrip()
    shelf = (
        f"""
  <section class="below-fold-shelf" aria-labelledby="below-fold-back-issues-title">
    <div class="below-fold-shelf__head">
      <div>
        <p class="below-fold-kicker">Back Issues</p>
        <h3 id="below-fold-back-issues-title">Old papers in the stack</h3>
      </div>
      <a href="{h(BELOW_FOLD_NEWSSTAND_URL)}">Browse all</a>
    </div>
    <div class="below-fold-shelf__track" tabindex="0" aria-label="Recent Below the Fold back issues">
      {back_cards}
    </div>
  </section>
""".rstrip()
        if back_cards
        else ""
    )
    return "\n".join(part for part in (flipper, shelf) if part).strip()


def render_below_fold_newsstand() -> str:
    issues = below_fold_issues_newest()
    latest = issues[0] if issues else None
    cards = "\n".join(below_fold_issue_card(issue) for issue in issues)
    featured = below_fold_issue_card(latest, "below-fold-issue-card--feature", "eager") if latest else ""
    latest_intro = (
        f'<p>{h(latest.get("dek") or "")}</p>'
        if latest
        else "<p>No Below the Fold issues have been registered yet.</p>"
    )
    main = f"""
<main class="page below-fold-newsstand">
  <section class="below-fold-newsstand__masthead">
    <p class="eyebrow">Below the Fold</p>
    <h1>The Newsstand</h1>
    <p>A browsable rack of every Below the Fold issue: the slower files, designed spreads, odd ledgers, and folded-paper experiments that should not vanish from the front page archive.</p>
  </section>
  <section class="below-fold-newsstand__latest" aria-labelledby="below-fold-newsstand-latest-title">
    <div class="below-fold-newsstand__section-head">
      <div>
        <p class="below-fold-kicker">Current paper</p>
        <h2 id="below-fold-newsstand-latest-title">Latest Issue</h2>
      </div>
      {latest_intro}
    </div>
    {featured}
  </section>
  <section class="below-fold-newsstand__issues" aria-labelledby="below-fold-newsstand-issues-title">
    <div class="below-fold-newsstand__section-head">
      <div>
        <p class="below-fold-kicker">Back Issues</p>
        <h2 id="below-fold-newsstand-issues-title">Every issue on the rack</h2>
      </div>
      <p>Newest first, with permanent pages for every edition.</p>
    </div>
    <div class="below-fold-newsstand__grid">
      {cards}
    </div>
  </section>
</main>
""".strip()
    social_image = str(latest.get("thumbnail") or "") if latest else ""
    return layout(
        f"Below the Fold: The Newsstand — {SITE['name']}",
        "A browsable archive of every Below the Fold issue from The Press.",
        BELOW_FOLD_NEWSSTAND_URL,
        "page-below-fold-newsstand",
        main,
        current_aux=BELOW_FOLD_NEWSSTAND_URL,
        jsonld=jsonld_org(),
        social_image=social_image,
        social_image_alt=str(latest.get("imageAlt") or "Below the Fold Newsstand") if latest else "",
        social_image_width=latest.get("thumbnailWidth", "") if latest else "",
        social_image_height=latest.get("thumbnailHeight", "") if latest else "",
        social_title="Below the Fold: The Newsstand",
    )


def below_fold_issue_neighbors(issue: dict) -> tuple[dict | None, dict | None]:
    issues = sorted(BELOW_FOLD_ISSUES, key=lambda row: row["issueNumber"])
    for index, row in enumerate(issues):
        if row["slug"] != issue["slug"]:
            continue
        previous_issue = issues[index - 1] if index > 0 else None
        next_issue = issues[index + 1] if index + 1 < len(issues) else None
        return previous_issue, next_issue
    return None, None


def render_below_fold_issue_nav(issue: dict) -> str:
    previous_issue, next_issue = below_fold_issue_neighbors(issue)
    previous_html = (
        f'<a href="{h(previous_issue["url"])}" rel="prev">&larr; Previous issue</a>'
        if previous_issue
        else '<span aria-disabled="true">&larr; Previous issue</span>'
    )
    next_html = (
        f'<a href="{h(next_issue["url"])}" rel="next">Next issue &rarr;</a>'
        if next_issue
        else '<span aria-disabled="true">Next issue &rarr;</span>'
    )
    return f"""
<nav class="below-fold-issue-nav" aria-label="{h(issue.get('title') or 'Below the Fold')} issue navigation">
  {previous_html}
  <a href="{h(BELOW_FOLD_NEWSSTAND_URL)}">Back to The Newsstand</a>
  {next_html}
</nav>
""".strip()


def render_below_fold_issue_page(issue: dict) -> str:
    nav = render_below_fold_issue_nav(issue)
    title = str(issue.get("title") or "Below the Fold").strip()
    dek = str(issue.get("dek") or "").strip()
    issue_meta = " / ".join(
        bit for bit in [below_fold_issue_number_label(issue), str(issue.get("dateLabel") or "").strip()] if bit
    )
    main = f"""
<main class="page below-fold-issue-page">
  {nav}
  <article class="below-fold-issue-page__paper" aria-labelledby="below-fold-issue-page-title">
    <header class="below-fold-issue-page__masthead">
      <p class="eyebrow">Below the Fold</p>
      <p class="below-fold-issue-page__meta">{h(issue_meta)}</p>
      <h1 id="below-fold-issue-page-title">{h(title)}</h1>
      <p>{h(dek)}</p>
      <a href="{h(BELOW_FOLD_NEWSSTAND_URL)}">The Newsstand</a>
    </header>
    <div class="below-fold-issue-page__content">
      {render_below_fold_issue_body(issue)}
    </div>
  </article>
  {nav}
</main>
""".strip()
    return layout(
        f"{title} — Below the Fold — {SITE['name']}",
        dek or "A permanent Below the Fold issue from The Press.",
        str(issue["url"]),
        "page-below-fold-issue",
        main,
        current_aux=BELOW_FOLD_NEWSSTAND_URL,
        jsonld=jsonld_org(),
        include_progress=True,
        base_href="../",
        social_image=str(issue.get("thumbnail") or ""),
        social_image_alt=str(issue.get("imageAlt") or title),
        social_image_width=issue.get("thumbnailWidth", ""),
        social_image_height=issue.get("thumbnailHeight", ""),
        social_title=f"{title} — Below the Fold",
    )


def below_fold_search_index_rows() -> list[dict]:
    rows: list[dict] = []
    latest = below_fold_latest_issue()
    if latest:
        rows.append(
            {
                "title": "Below the Fold: The Newsstand",
                "section": "Below the Fold",
                "type": "Newsstand",
                "dek": "A browsable archive of every Below the Fold issue from The Press.",
                "url": BELOW_FOLD_NEWSSTAND_URL,
                "author": PUBLIC_AUTHOR_LABEL,
                "published": str(latest.get("dateLabel") or ""),
                "publishedIso": str(latest.get("publishedIso") or ""),
                "updatedIso": str(latest.get("publishedIso") or ""),
                "image": str(latest.get("thumbnail") or ""),
                "imageAlt": str(latest.get("imageAlt") or "Below the Fold Newsstand"),
                "imageWidth": latest.get("thumbnailWidth"),
                "imageHeight": latest.get("thumbnailHeight"),
                "keywords": ["Below the Fold", "Newsstand", "archive"],
                "newsstandOnly": True,
                "excludeFromEdition": True,
                "excludeFromArchive": True,
                "excludeFromGallery": True,
            }
        )
    for issue in below_fold_issues_newest():
        rows.append(
            {
                "title": str(issue.get("title") or "Below the Fold"),
                "section": "Below the Fold",
                "type": "Issue",
                "dek": str(issue.get("dek") or ""),
                "url": str(issue["url"]),
                "author": PUBLIC_AUTHOR_LABEL,
                "published": str(issue.get("dateLabel") or ""),
                "publishedIso": str(issue.get("publishedIso") or ""),
                "updatedIso": str(issue.get("publishedIso") or ""),
                "image": str(issue.get("thumbnail") or ""),
                "imageAlt": str(issue.get("imageAlt") or issue.get("title") or "Below the Fold issue"),
                "imageWidth": issue.get("thumbnailWidth"),
                "imageHeight": issue.get("thumbnailHeight"),
                "keywords": ["Below the Fold", str(issue.get("rubric") or ""), str(issue.get("sectionLabel") or "")],
                "newsstandOnly": True,
                "excludeFromEdition": True,
                "excludeFromArchive": True,
                "excludeFromGallery": True,
            }
        )
    return rows


def below_fold_sitemap_paths() -> list[str]:
    return [BELOW_FOLD_NEWSSTAND_URL] + [issue["url"] for issue in below_fold_issues_newest()]


def below_fold_lastmod(path: str) -> datetime:
    if path == BELOW_FOLD_NEWSSTAND_URL:
        dates = [
            parsed
            for issue in BELOW_FOLD_ISSUES
            if (parsed := parse_iso_datetime(issue.get("publishedIso")))
        ]
        return max(dates) if dates else BUILD_REFERENCE_DT
    for issue in BELOW_FOLD_ISSUES:
        if issue["url"] == path:
            return parse_iso_datetime(issue.get("publishedIso")) or BUILD_REFERENCE_DT
    return BUILD_REFERENCE_DT


def collect_below_fold_json_urls(value: object) -> list[str]:
    found: list[str] = []
    url_fields = {"url", "href", "link", "filename", "permalink", "canonicalUrl", "canonical_url"}
    if isinstance(value, dict):
        for key, child in value.items():
            if key in url_fields and is_below_fold_url(child):
                found.append(str(child))
            found.extend(collect_below_fold_json_urls(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(collect_below_fold_json_urls(child))
    return found


def validate_below_fold_build_outputs() -> None:
    if not BELOW_FOLD_ISSUES:
        return

    latest = below_fold_latest_issue()
    if latest is None:
        return

    missing_pages = [
        issue["url"]
        for issue in BELOW_FOLD_ISSUES
        if not (SITE_DIR / issue["url"]).exists()
    ]
    if missing_pages:
        raise RuntimeError(f"Below the Fold issue pages missing after build: {', '.join(missing_pages)}")

    homepage = (SITE_DIR / "index.html").read_text(encoding="utf-8")
    homepage_issue_markers = set(re.findall(r'data-below-fold-package="([^"]+)"', homepage))
    if latest["slug"] not in homepage_issue_markers:
        raise RuntimeError(f"Homepage must render the latest Below the Fold issue open: {latest['slug']}")
    older_open_issues = sorted(slug for slug in homepage_issue_markers if slug != latest["slug"])
    if older_open_issues:
        raise RuntimeError(
            "Homepage must not stack older Below the Fold issues open: "
            + ", ".join(older_open_issues)
        )

    forbidden_pages = ("archive.html", "gallery.html")
    forbidden_link_re = re.compile(r'href=["\'](?:\./)?(below-the-fold(?:\.html|/[^"\'#?]+))', re.I)
    for filename in forbidden_pages:
        page = (SITE_DIR / filename).read_text(encoding="utf-8")
        matches = sorted(set(forbidden_link_re.findall(page)))
        if matches:
            raise RuntimeError(f"{filename} must not list Below the Fold issues: {', '.join(matches)}")

    for filename in ("content-index.json", "live-index.json", "archive-index.json", "placements.json"):
        path = SITE_DIR / filename
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        matches = sorted(set(collect_below_fold_json_urls(payload)))
        if matches:
            raise RuntimeError(f"{filename} must not include Below the Fold issue URLs: {', '.join(matches)}")

    search_path = SITE_DIR / "search-index.json"
    if search_path.exists():
        payload = json.loads(search_path.read_text(encoding="utf-8"))
        rows = payload.get("stories") if isinstance(payload, dict) else payload
        if isinstance(rows, list):
            allowed_below_fold_urls = {BELOW_FOLD_NEWSSTAND_URL, *(issue["url"] for issue in BELOW_FOLD_ISSUES)}
            for item in rows:
                if not isinstance(item, dict) or not is_below_fold_index_item(item):
                    continue
                url = item.get("url")
                if is_below_fold_url(url) and url not in allowed_below_fold_urls:
                    raise RuntimeError(f"search-index.json includes removed Below the Fold URL: {url}")
                required_flags = ("newsstandOnly", "excludeFromEdition", "excludeFromArchive", "excludeFromGallery")
                missing_flags = [flag for flag in required_flags if item.get(flag) is not True]
                if missing_flags:
                    raise RuntimeError(
                        f"Below the Fold search row {item.get('url') or item.get('title')} is missing "
                        + ", ".join(missing_flags)
                    )

    sitemap = (SITE_DIR / "sitemap.xml").read_text(encoding="utf-8")
    missing_sitemap_paths = [path for path in below_fold_sitemap_paths() if path not in sitemap]
    if missing_sitemap_paths:
        raise RuntimeError("sitemap.xml is missing Below the Fold paths: " + ", ".join(missing_sitemap_paths))


def river_item(story: dict) -> str:
    return f"""
<article class="river-item">
  <a class="river-item__thumb" href="{h(story['filename'])}">
    <img src="{h(story['image'])}" alt="{h(public_image_alt(story, story['title']))}" loading="lazy" decoding="async"{f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ''}{f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ''} />
  </a>
  <div class="river-item__body">
    <p class="eyebrow eyebrow--tiny">{h(story['section'])} • {h(story['type'])}</p>
    <h3><a href="{h(story['filename'])}">{h(story['title'])}</a></h3>
    <p>{h(story['excerpt'])}</p>
    <p class="river-item__meta">{public_meta(story)}</p>
  </div>
</article>
""".strip()


def ranked_list_item(story: dict, rank: int) -> str:
    return f"""
<li class="link-list__item">
  <span class="rank-number">{rank}</span>
  <div>
    <p class="eyebrow eyebrow--tiny">{h(story['section'])} • {h(story['type'])}</p>
    <a href="{h(story['filename'])}">{h(story['title'])}</a>
    <p class="link-list__meta">{public_meta(story)}</p>
  </div>
</li>
""".strip()


def simple_list_item(story: dict) -> str:
    return f"""
<li class="link-list__item">
  <div>
    <p class="eyebrow eyebrow--tiny">{h(story['section'])} • {h(story['type'])}</p>
    <a href="{h(story['filename'])}">{h(story['title'])}</a>
    <p class="link-list__meta">{public_meta(story)}</p>
  </div>
</li>
""".strip()


def desk_card(section: dict, top_story: dict) -> str:
    return f"""
<article class="desk-card">
  <p class="desk-card__kicker">{h(section['eyebrow'])}</p>
  <h3><a href="{h(section['filename'])}">{h(section['headline'])}</a></h3>
  <p>{h(section['copy'])}</p>
  <a class="desk-card__story" href="{h(top_story['filename'])}">{h(top_story['title'])}</a>
</article>
""".strip()


def related_block(story: dict) -> str:
    related = related_stories(story)
    if not related:
        return '<section id="related-stories" class="related-block"><h2>Related reading</h2><p class="empty-state">Related stories will appear here as the desk grows.</p></section>'
    cards = "\n".join(story_card(item, extra_class="story-card--related") for item in related)
    return f"""
<section id="related-stories" class="related-block">
  <h2>Related reading</h2>
  <div class="related-grid">
    {cards}
  </div>
</section>
""".strip()




def gallery_block(story: dict) -> str:
    images = story.get("galleryImages") or []
    if not isinstance(images, list) or not images:
        return ""

    figures = []
    for idx, image in enumerate(images[:10], start=1):
        if not isinstance(image, dict):
            continue
        src = str(image.get("src") or "").strip()
        if not src:
            continue
        alt = public_image_alt(image.get("alt"), f"Visual {idx} for {story['title']}")
        style = image.get("style") or "artistic"
        caption_html = public_image_credit(image.get("captionHtml") or image.get("relevanceNote"))
        figcaption_html = f"\n  <figcaption>{caption_html}</figcaption>" if caption_html else ""
        figures.append(
            f'''
<figure class="ai-article-gallery__item" data-ai-art-index="{idx}" data-ai-art-style="{h(style)}">
  <img src="{h(src)}" alt="{h(alt)}" loading="lazy" decoding="async" />{figcaption_html}
</figure>
'''.strip()
        )

    if not figures:
        return ""

    return f'''
<section class="ai-article-gallery" data-ai-article-gallery>
  <div class="ai-article-gallery__header">
    <p class="eyebrow eyebrow--tiny">Visual brief</p>
    <h2>Scenes and explainers from this story</h2>
    <p>Additional visuals connected to this article's reporting.</p>
  </div>
  <div class="ai-article-gallery__grid">
    {''.join(figures)}
  </div>
</section>
'''.strip()



def social_embed_platform_label(platform: str) -> str:
    value = (platform or "").strip().lower()
    labels = {
        "x": "X",
        "twitter": "X",
        "bluesky": "Bluesky",
        "bsky": "Bluesky",
        "threads": "Threads",
        "instagram": "Instagram",
        "ig": "Instagram",
        "tiktok": "TikTok",
        "linkedin": "LinkedIn",
        "facebook": "Facebook",
        "fb": "Facebook",
        "youtube": "YouTube",
    }
    return labels.get(value, platform.strip().title() if platform else "Social")


def social_embed_placement_matches(post: dict, placement: str) -> bool:
    raw = str(post.get("placement") or "both").strip().lower()
    aliases = {
        "side": "rail",
        "sidebar": "rail",
        "rail": "rail",
        "right": "rail",
        "bottom": "bottom",
        "footer": "bottom",
        "end": "bottom",
        "both": "both",
        "all": "both",
    }
    normalized = aliases.get(raw, raw)
    if placement == "rail":
        return normalized in {"rail", "both"}
    if placement == "bottom":
        return normalized in {"bottom", "both"}
    return True


def social_embed_scripts(posts: list[dict]) -> str:
    needs_x = False
    needs_bluesky = False
    needs_tiktok = False

    for post in posts:
        platform = str(post.get("platform") or "").lower()
        url = str(post.get("url") or "").lower()
        embed_html = str(post.get("embedHtml") or post.get("html") or "")
        embed_lower = embed_html.lower()

        # X URL-only cards are converted to a real tweet embed below, so load the widget.
        if platform in {"x", "twitter"} or "twitter-tweet" in embed_lower:
            if "platform.twitter.com/widgets.js" not in embed_lower:
                needs_x = True
        # Other platforms load widgets only when the editor supplies actual embed HTML.
        if (embed_html and platform in {"bluesky", "bsky"}) or "bluesky-embed" in embed_lower:
            if "embed.bsky.app/static/embed.js" not in embed_lower:
                needs_bluesky = True
        if (embed_html and platform == "tiktok") or "tiktok-embed" in embed_lower:
            if "tiktok.com/embed.js" not in embed_lower:
                needs_tiktok = True

    scripts = []
    if needs_x:
        scripts.append('<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>')
    if needs_bluesky:
        scripts.append('<script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>')
    if needs_tiktok:
        scripts.append('<script async src="https://www.tiktok.com/embed.js"></script>')
    return "\n".join(scripts)


def social_embed_card(post: dict) -> str:
    platform_raw = str(post.get("platform") or "").strip()
    platform = social_embed_platform_label(platform_raw)
    platform_key = platform_raw.lower()
    label = str(post.get("label") or post.get("title") or "Public conversation").strip()
    author = str(post.get("author") or "").strip()
    handle = str(post.get("handle") or "").strip()
    date = str(post.get("date") or "").strip()
    url = str(post.get("url") or "").strip()
    note = str(post.get("note") or post.get("dek") or post.get("summary") or "").strip()
    embed_html = str(post.get("embedHtml") or post.get("html") or "").strip()

    meta_bits = [bit for bit in [author, handle, date] if bit]
    meta_html = f'<p class="social-embed-card__meta">{h(" • ".join(meta_bits))}</p>' if meta_bits else ""
    note_html = f'<p class="social-embed-card__note">{h(note)}</p>' if note else ""
    link_html = f'<a class="social-embed-card__link" href="{h(url)}" target="_blank" rel="noopener noreferrer">View original post</a>' if url else ""

    if embed_html:
        body_html = f'<div class="social-embed-card__embed">{embed_html}</div>'
    elif url and platform_key in {"x", "twitter"}:
        body_html = f'<div class="social-embed-card__embed"><blockquote class="twitter-tweet" data-dnt="true"><a href="{h(url)}"></a></blockquote></div>'
    else:
        body_html = f"""
        <div class="social-embed-card__fallback">
            {note_html}
            {link_html}
        </div>
        """.strip()

    return f"""
<article class="social-embed-card">
    <div class="social-embed-card__label-row">
        <span class="social-embed-card__platform">{h(platform)}</span>
        <span class="social-embed-card__label">{h(label)}</span>
    </div>
    {meta_html}
    {body_html}
</article>
""".strip()


def social_embeds_block(story: dict, placement: str = "rail") -> str:
    posts = story.get("socialEmbeds") or story.get("socialPosts") or []
    if not isinstance(posts, list):
        return ""

    selected = [post for post in posts if isinstance(post, dict) and social_embed_placement_matches(post, placement)]
    if not selected:
        return ""

    selected = selected[:6]
    title = story.get("socialEmbedsTitle") or "Public conversation"
    intro = story.get("socialEmbedsIntro") or "Curated posts selected for context. Inclusion is not endorsement."
    modifier = "social-embed-panel--rail" if placement == "rail" else "social-embed-panel--bottom"
    cards_html = "\n".join(social_embed_card(post) for post in selected)
    scripts_html = social_embed_scripts(selected)

    return f"""
<section class="social-embed-panel {modifier}" aria-label="{h(title)}">
    <p class="social-embed-panel__eyebrow">Social context</p>
    <h2 class="social-embed-panel__title">{h(title)}</h2>
    <p class="social-embed-panel__intro">{h(intro)}</p>
    <div class="social-post-stack">
        {cards_html}
    </div>
</section>
{scripts_html}
""".strip()

def header(current_section: str = "", current_aux: str = "") -> str:
    utility_links = []
    for link in SITE.get("mastheadLinks", []):
        current = ' aria-current="page"' if current_aux == link["href"] else ""
        utility_links.append(f'<a class="utility-link" href="{h(link["href"])}"{current}>{h(public_nav_label(link["label"]))}</a>')
    return f"""
<header class="site-header" data-site-header>
  <div class="masthead-row">
    <div class="masthead-wrap">
      <a class="masthead masthead-with-logo" href="index.html" aria-label="The Press home"><img class="masthead-logo" src="assets/the-press-logo.svg" alt="The Press logo" decoding="async" /></a>
    </div>
    <div class="masthead-actions">
      <nav class="utility-nav" aria-label="Utility navigation">
        {' '.join(utility_links)}
      </nav>
      <div class="header-controls">
        <button aria-label="Toggle dark mode" class="theme-toggle" data-theme-toggle title="Toggle dark/light mode" type="button">☀︎</button>
        <button class="search-trigger" type="button" data-search-open aria-label="Search" title="Search"><svg class="search-trigger__icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l5 5"></path></svg><span class="sr-only">Search</span></button>
      </div>
    </div>
    <div class="masthead-ticker" aria-label="Latest headlines">
      <div class="masthead-ticker__items" data-masthead-ticker></div>
    </div>
  </div>
</header>
""".strip()


def footer() -> str:
    newsroom_links = """
<li><a href="archive.html">Archive</a></li>
<li><a href="gallery.html">Gallery</a></li>
<li><a href="authors.html">Masthead</a></li>
<li><a href="about.html">About</a></li>
<li><a href="photo-workflow.html">Photo workflow</a></li>
""".strip()
    return f"""
<footer class="site-footer">
  <div class="footer-grid footer-grid--archive-only">
    <section class="footer-brand">
      <a class="masthead masthead--footer" href="index.html">{h(SITE['name'])}</a>
      <p class="footer-copy footer-copy--small">Source notes, clear dates, and corrections in view.</p>
    </section>
    <section>
      <h2 class="footer-heading">Newsroom</h2>
      <ul class="footer-list">
        {newsroom_links}
      </ul>
    </section>
  </div>
  <div class="footer-rule">
    <p class="footer-copy footer-copy--small">© <span data-year></span> {h(SITE['name'])}. Built as a static-first newsroom package.</p>
  </div>
</footer>
""".strip()


def search_overlay() -> str:
    return f"""
<div class="search-overlay" hidden data-search-overlay>
  <div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
    <div class="search-panel__header">
      <h2 id="search-title">Search {h(SITE['name'])}</h2>
      <button class="search-close" type="button" aria-label="Close search" data-search-close>Close</button>
    </div>
    <label class="search-label" for="global-search-input">Search headlines, sections, or topics</label>
    <input class="search-input" id="global-search-input" type="search" placeholder="Search for housing, NASA, attendance, elections…" autocomplete="off" data-search-input />
    <p class="search-hint">Results update as you type. Try: housing, Artemis, voter registration, measles, streaming.</p>
    <div class="search-results" data-search-results>
      <div class="search-empty">
        <p>Start typing to search the full edition.</p>
      </div>
    </div>
  </div>
</div>
""".strip()


def social_meta(
    title: str,
    description: str,
    canonical: str,
    image: str = "",
    image_alt: str = "",
    image_width: object = "",
    image_height: object = "",
    og_type: str = "website",
) -> str:
    canonical_url = absolute_url(canonical)
    image_path = versioned_asset_url(image or "assets/icon-512.png")
    image_url = image_path if re.match(r"^[a-z][a-z0-9+.-]*:", image_path, re.I) else absolute_url(image_path)
    image_ext = Path(str(image_path).split("?", 1)[0]).suffix.lower().lstrip(".")
    image_type = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "avif": "image/avif",
        "svg": "image/svg+xml",
    }.get(image_ext)
    card_type = "summary_large_image" if image else "summary"
    lines = [
        f'<meta property="og:type" content="{h(og_type)}" />',
        f'<meta property="og:site_name" content="{h(SITE["name"])}" />',
        f'<meta property="og:title" content="{h(title)}" />',
        f'<meta property="og:description" content="{h(description)}" />',
        f'<meta property="og:url" content="{h(canonical_url)}" />',
        f'<meta property="og:image" content="{h(image_url)}" />',
        f'<meta property="og:image:secure_url" content="{h(image_url)}" />',
        f'<meta name="twitter:card" content="{h(card_type)}" />',
        f'<meta name="twitter:url" content="{h(canonical_url)}" />',
        f'<meta name="twitter:title" content="{h(title)}" />',
        f'<meta name="twitter:description" content="{h(description)}" />',
        f'<meta name="twitter:image" content="{h(image_url)}" />',
    ]
    if image_type:
        lines.append(f'<meta property="og:image:type" content="{h(image_type)}" />')
    if image_alt:
        lines.extend([
            f'<meta property="og:image:alt" content="{h(image_alt)}" />',
            f'<meta name="twitter:image:alt" content="{h(image_alt)}" />',
        ])
    if image_width:
        lines.append(f'<meta property="og:image:width" content="{h(image_width)}" />')
    if image_height:
        lines.append(f'<meta property="og:image:height" content="{h(image_height)}" />')
    return "\n".join(lines)


def page_head(
    title: str,
    description: str,
    canonical: str,
    jsonld: str = "",
    extra_links: str = "",
    social_image: str = "",
    social_image_alt: str = "",
    social_image_width: object = "",
    social_image_height: object = "",
    og_type: str = "website",
    social_title: str = "",
    base_href: str = "",
) -> str:
    canonical_url = absolute_url(canonical)
    social = social_meta(
        social_title or title,
        description,
        canonical,
        image=social_image,
        image_alt=social_image_alt,
        image_width=social_image_width,
        image_height=social_image_height,
        og_type=og_type,
    )
    base_html = f'\n  <base href="{h(base_href)}" />' if base_href else ""
    head_extras = "\n".join(
        "\n".join(f"  {line}" for line in block.splitlines())
        for block in (social, jsonld, extra_links)
        if block
    )
    extras_html = f"\n{head_extras}" if head_extras else ""
    return f"""
<head>
  <meta charset="utf-8" />
  <title>{h(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="{h(description)}" />
  <meta name="theme-color" content="#f4f0e8" />
  <meta name="apple-mobile-web-app-title" content="{h(SITE['name'])}" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="canonical" href="{h(canonical_url)}" />{base_html}
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />
  <link rel="shortcut icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="assets/icon-192.png" sizes="192x192" type="image/png" />
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="{h(PRESS_FONT_HREF)}" data-press-fonts />
  <link rel="stylesheet" href="styles.css?v={h(STYLESHEET_VERSION)}" />
  <link rel="manifest" href="site.webmanifest" />
  <link rel="alternate" type="application/rss+xml" title="{h(SITE['name'])} feed" href="feed.xml" />{extras_html}
</head>
""".strip()


def jsonld_org() -> str:
    obj = {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        "name": SITE["name"],
        "url": SITE["baseUrl"],
        "logo": absolute_url("assets/favicon.svg"),
        "slogan": SITE["tagline"],
        "diversityPolicy": absolute_url("about.html"),
    }
    return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False)}</script>'


def jsonld_article(story: dict) -> str:
    obj = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": story["title"],
        "description": story["dek"],
        "isAccessibleForFree": True,
        "mainEntityOfPage": {"@type": "WebPage", "@id": absolute_url(story["filename"])},
        "datePublished": story["publishedIso"],
        "dateModified": story["updatedIso"],
        "articleSection": story["section"],
        "wordCount": story.get("wordCountNumber"),
        "author": {
            "@type": "Person",
            "name": story["author"],
            "url": absolute_url(f"authors.html#{story['authorSlug']}"),
        },
        "image": {
            "@type": "ImageObject",
            "url": absolute_url(story["image"]),
            "width": story.get("imageWidth"),
            "height": story.get("imageHeight"),
        },
        "publisher": {
            "@type": "NewsMediaOrganization",
            "name": SITE["name"],
            "url": SITE["baseUrl"],
            "logo": {"@type": "ImageObject", "url": absolute_url("assets/favicon.svg")},
        },
    }
    return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False)}</script>'


def layout(
    title: str,
    description: str,
    canonical: str,
    body_class: str,
    main_html: str,
    current_section: str = "",
    current_aux: str = "",
    jsonld: str = "",
    include_progress: bool = False,
    extra_links: str = "",
    extra_scripts: str = "",
    post_scripts: str = "",
    social_image: str = "",
    social_image_alt: str = "",
    social_image_width: object = "",
    social_image_height: object = "",
    og_type: str = "website",
    social_title: str = "",
    base_href: str = "",
    show_header: bool = True,
) -> str:
    progress = """
<div class="reading-progress"><div class="reading-progress__bar" data-reading-progress></div></div>
""".strip() if include_progress else ""
    scripts = []
    if extra_scripts:
        scripts.append(extra_scripts)
    scripts.append(f'<script src="app.js?v={h(APP_VERSION)}" defer></script>')
    if post_scripts:
        scripts.append(post_scripts)
    scripts_html = "\n".join(scripts)
    progress_html = f"  {progress}\n" if progress else ""
    header_html = f"  {header(current_section=current_section, current_aux=current_aux)}\n" if show_header else ""
    return f"""<!doctype html>
<html lang="en">
{page_head(
    title,
    description,
    canonical,
    jsonld,
    extra_links=extra_links,
    social_image=social_image,
    social_image_alt=social_image_alt,
    social_image_width=social_image_width,
    social_image_height=social_image_height,
    og_type=og_type,
    social_title=social_title,
    base_href=base_href,
)}
<body class="{h(body_class)}">
  {search_overlay()}
{progress_html}{header_html}  {main_html}
  {footer()}
{scripts_html}
</body>
</html>
""".strip() + "\n"


def render_homepage() -> str:
    lead_panels = []
    lead_buttons = []
    lead_stories = homepage_lead_stories()
    for idx, story in enumerate(lead_stories):
        active = " is-active" if idx == 0 else ""
        panel_width = f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ""
        panel_height = f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ""
        panel_loading = "eager" if idx == 0 else "lazy"
        panel_priority = ' fetchpriority="high"' if idx == 0 else ' fetchpriority="low"'
        panel_media = (
            f'<img src="{h(story["image"])}" alt="{h(public_image_alt(story, story.get("title") or "Story thumbnail"))}" loading="{panel_loading}" decoding="async"{panel_priority}{panel_width}{panel_height} />'
            if story.get("image")
            else f'<div class="press-image-fallback"><span>{h(story.get("section") or "Story")}</span></div>'
        )
        lead_panels.append(
            f"""
<div class="lead-panel{active}" data-lead-panel id="lead-{idx}">
  <div class="lead-panel__media">
    {panel_media}
  </div>
  <div class="lead-panel__body">
    <div>
      <p class="eyebrow">Front Page • {h(story['section'])} • {h(story['type'])}</p>
      <h2><a href="{h(story['filename'])}">{h(story['title'])}</a></h2>
      <p class="lead-panel__dek">{h(story['dek'])}</p>
      <p class="lead-panel__meta">{public_meta(story)}</p>
    </div>
    <div class="button-row">
      <a class="button" href="{h(story['filename'])}">Read story</a>
      <a class="button button--ghost" href="archive.html">Open archive</a>
    </div>
  </div>
</div>
""".strip()
        )
        thumb_width = f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ""
        thumb_height = f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ""
        thumb = (
            f'<span class="lead-nav__thumb" aria-hidden="true"><img src="{h(story["image"])}" alt="" loading="lazy" decoding="async"{thumb_width}{thumb_height} /></span>'
            if story.get("image")
            else f'<span class="lead-nav__thumb lead-nav__thumb--fallback" aria-hidden="true"><span>{h(story["section"])}</span></span>'
        )
        side_slot = ""
        if 1 <= idx <= 3:
            side_slot = f' data-side-slot="left-{idx}"'
        elif 4 <= idx <= 6:
            side_slot = f' data-side-slot="right-{idx - 3}"'
        lead_buttons.append(
            f'<button class="lead-nav__button{" is-active" if idx == 0 else ""}" type="button" data-lead-button data-story-key="{h(story["filename"])}" data-target="lead-{idx}" aria-pressed="{str(idx == 0).lower()}"{side_slot}>{thumb}<span class="lead-nav__kicker">{h(story["section"])}</span><strong>{h(story["title"])}</strong></button>'
        )
    recency_stories = homepage_recency_stories(lead_stories)
    recency_cards = "\n".join(recency_ticker_item(story) for story in recency_stories)
    recency_cards_duplicate = "\n".join(recency_ticker_item(story, duplicate=True) for story in recency_stories)
    main = f"""
<main class="page">
  <section class="home-hero">
    <div class="home-hero__intro">
      <p class="eyebrow">Front page</p>
      <h1>{h(SITE['name'])}</h1>
    </div>
    <div class="lead-switcher" data-press-hero-layout="split-rail" data-press-hero-slots="{HOME_HERO_TARGET}">
      <div class="lead-switcher__panels">
        {' '.join(lead_panels)}
      </div>
      <div class="lead-nav" aria-label="Lead story switcher">
        {' '.join(lead_buttons)}
      </div>
    </div>
  </section>

  <section class="home-recency-section" data-home-recency-section>
      <div class="section-heading-row">
        <h2 class="section-heading">More from the edition</h2>
        <a class="section-link" href="archive.html">Open archive</a>
      </div>
      <div class="home-recency-ticker" data-home-recency-ticker aria-label="The 15 newest stories that are not already in the hero">
        <div class="home-recency-ticker__track">
          <div class="home-recency-ticker__set">
            {recency_cards}
          </div>
          <div class="home-recency-ticker__set" aria-hidden="true">
            {recency_cards_duplicate}
          </div>
        </div>
      </div>
  </section>

  <section class="home-grid">
    <div class="home-grid__main">
      <section class="on-this-day" id="on-this-day" data-on-this-day aria-live="polite">
        <div class="on-this-day__header">
          <div class="on-this-day__intro">
            <h2 class="section-heading">On This Day History</h2>
            <p class="section-copy" data-history-date>Loading today’s historical moment.</p>
          </div>
          <a class="on-this-day__count" href="on-this-day-preview.html">Preview all 365</a>
        </div>
        <div class="on-this-day__layout">
          <div class="on-this-day__visuals">
            <figure class="on-this-day__art" data-history-art aria-label="Photorealistic editorial scene for today’s historical moment"></figure>
          </div>
          <article class="on-this-day__story" data-history-card-link tabindex="0">
            <p class="on-this-day__year" data-history-year></p>
            <h3 data-history-title>Checking the archive</h3>
            <p class="on-this-day__dek" data-history-dek></p>
            <p data-history-text></p>
            <div class="on-this-day__facts" data-history-facts></div>
            <a class="on-this-day__more" href="on-this-day-event.html" data-history-detail-link>Read more about this</a>
            <div class="on-this-day__meta">
              <span data-history-rollover>Synced to the live clock; changes at 12:00 AM local time.</span>
            </div>
          </article>
        </div>
      </section>
      {render_home_below_fold_newsstand()}
      {render_home_cartoons()}
    </div>
  </section>

</main>
""".strip()
    return layout(
        f"{SITE['name']} — Front Page",
        SITE["description"],
        "",
        "page-home",
        main,
        jsonld=jsonld_org(),
        social_image="assets/the-press-front-page-share-card.png",
        social_image_alt="The Press front page share card with a four-story collage across technology, world, climate, and science",
        social_image_width="1200",
        social_image_height="630",
        social_title=SITE["name"],
        extra_links=f'<link rel="stylesheet" href="homepage.css?v={h(asset_version("homepage.css"))}" />',
        extra_scripts="\n".join([
            f'<script src="assets/on-this-day-summary.js?v={h(asset_version("assets/on-this-day-summary.js"))}" defer></script>',
            f'<script src="assets/on-this-day-artwork.js?v={h(asset_version("assets/on-this-day-artwork.js"))}" defer></script>',
        ]),
        post_scripts=f'<script src="homepage.js?v={h(asset_version("homepage.js"))}" defer></script>',
    )


def render_archive() -> str:
    archive_stories = shared_archive_stories()
    filters = ['All'] + [section['name'] for section in SECTIONS if section.get("slug") != "cartoons"] + sorted({story['type'] for story in archive_stories})
    filter_buttons = "\n".join(
        f'<button class="filter-chip{" is-active" if value=="All" else ""}" type="button" data-filter="{h(value)}" aria-pressed="{str(value=="All").lower()}">{h(value)}</button>'
        for value in filters
    )
    cards = "\n".join(story_card(story, archive=True) for story in archive_stories)
    main = f"""
<main class="page page-archive">
  <section class="page-hero">
    <p class="eyebrow">Archive</p>
    <h1>Every story in the edition</h1>
    <p class="section-copy">Filter by desk or story type. This page is generated from the master edition file, so a new feature automatically lands here after a rebuild.</p>
  </section>
  <section class="filter-toolbar" aria-label="Archive filters">
    {filter_buttons}
  </section>
  <section class="cards-section">
    <div class="cards-grid cards-grid--archive">
      {cards}
    </div>
  </section>
</main>
""".strip()
    return layout(f"Archive — {SITE['name']}", "The full archive of The Press.", "archive.html", "page-archive", main, current_aux="archive.html", jsonld=jsonld_org())


def render_gallery() -> str:
    gallery_rows = gallery_story_rows()
    tiles = "\n".join(
        f"""
<a class="gallery-tile" href="{h(story['filename'])}" aria-label="{h(story['title'])}">
  <img class="gallery-tile__image" src="{h(story['image'])}" alt="{h(public_image_alt(story.get('imageAlt'), story['title']))}" loading="lazy" decoding="async"{f' width="{story["imageWidth"]}"' if story.get("imageWidth") else ''}{f' height="{story["imageHeight"]}"' if story.get("imageHeight") else ''} />
  <span class="sr-only">{h(story['section'])} {h(story['type'])}: {h(story['title'])}</span>
</a>
""".strip()
        for story in gallery_rows
    )
    main = f"""
<main class="page">
  <section class="gallery-hero">
    <p class="eyebrow">Visual archive</p>
    <h1>Gallery</h1>
    <p>A visual wall of every story thumbnail in The Press. Click any image to open the full article.</p>
  </section>
  <section class="gallery-grid">
    {tiles}
  </section>
</main>
""".strip()
    return layout(
        f"Gallery — {SITE['name']}",
        "A visual gallery of every story thumbnail in The Press.",
        "gallery.html",
        "page-gallery",
        main,
        current_aux="gallery.html",
        jsonld=jsonld_org(),
    )


def render_section(section: dict) -> str:
    stories = section_stories(section["slug"])
    if not stories:
        cards = '<p class="empty-state">No stories published in this section yet.</p>'
    else:
        cards = "\n".join(story_card(story, archive=True) for story in stories)
    art = f'\n    <img class="page-art" src="{h(section["artwork"])}" alt="{h(section["headline"])} desk artwork" />' if section.get("artwork") else ""
    main = f"""
<main class="page">
  <section class="section-landing page-hero--with-art">
    <div>
      <p class="eyebrow">{h(section['eyebrow'])}</p>
      <h1>{h(section['headline'])}</h1>
      <p class="section-copy">{h(section['copy'])}</p>
    </div>{art}
  </section>
  <section class="cards-section">
    <div class="cards-grid cards-grid--archive">
      {cards}
    </div>
  </section>
</main>
""".strip()
    return layout(f"{section['headline']} — {SITE['name']}", section["copy"], section["filename"], "page-section", main, current_section=section["slug"], jsonld=jsonld_org())


def render_authors() -> str:
    main = """
<main class="page page-pledge__main">
<section class="pledge-hero">
  <div class="pledge-hero__copy">
    <p class="pledge-kicker">Masthead</p>
    <h1>
      <span>The Press</span>
      <span>publishes reported, source-forward stories.</span>
    </h1>
    <p class="pledge-hero__dek">
      The Press covers public systems, culture, science, technology, economics, health, and world affairs with clear dates,
      visible source notes, and corrections when the record changes.
    </p>
    <div class="pledge-hero__actions" aria-label="Masthead links">
      <a class="pledge-btn pledge-btn--primary" href="archive.html">Read the latest stories</a>
      <a class="pledge-btn pledge-btn--ghost" href="gallery.html">Open gallery</a>
    </div>
  </div>

  <aside class="pledge-card" aria-label="Editorial standards summary">
    <p class="pledge-card__label">Standards</p>
    <div class="pledge-seal" aria-hidden="true">
      <div class="pledge-seal__ring">
        <span class="pledge-seal__eyebrow">The</span>
        <strong>Press</strong>
        <span class="pledge-seal__subline">Masthead</span>
      </div>
      <div class="pledge-seal__chips">
        <span>Sourced</span>
        <span>Edited</span>
        <span>Correctable</span>
      </div>
    </div>
    <p>Every feature is built around the public record, context, and links readers can open for themselves.</p>
  </aside>
</section>

<section class="pledge-statement">
  <p class="pledge-kicker">Editorial Standard</p>
  <h2>Report the record. Explain the stakes. Keep the receipts close.</h2>
  <div class="pledge-prose">
    <p>The Press treats every article as an argument with evidence attached. Claims should be traceable to source notes, public records, datasets, direct statements, or clearly framed analysis.</p>
    <p>Stories are written for readers who want more than speed: they need context, dates, links, uncertainty where the evidence is incomplete, and plain corrections when something needs to be fixed.</p>
  </div>
</section>

<section class="pledge-receipts" aria-labelledby="receipts-title">
  <div>
    <p class="pledge-kicker">Receipts</p>
    <h2 id="receipts-title">The source trail is part of the product.</h2>
  </div>
  <div class="pledge-receipts__grid">
    <article>
      <h3>Primary records first</h3>
      <p>Government documents, datasets, court records, transcripts, official statements, and original research carry more weight than commentary.</p>
    </article>
    <article>
      <h3>Links readers can follow</h3>
      <p>The goal is to make authority checkable, not decorative.</p>
    </article>
    <article>
      <h3>Clear uncertainty</h3>
      <p>When evidence is partial, developing, disputed, or messy, the story should say so.</p>
    </article>
  </div>
</section>

<section class="pledge-warning" aria-labelledby="warning-title">
  <p class="pledge-warning__stamp">Reader Note</p>
  <h2 id="warning-title">Read closely. Follow the links. Tell us when something needs correction.</h2>
  <p>The Press is strongest when readers can inspect the evidence, compare the record, and push back on what is missing.</p>
  <div class="pledge-warning__actions">
    <a class="pledge-btn pledge-btn--primary" href="archive.html">Archive</a>
    <a class="pledge-btn pledge-btn--ghost" href="gallery.html">Gallery</a>
    <a class="pledge-btn pledge-btn--ghost" href="index.html">Front page</a>
  </div>
</section>
</main>
""".strip()

    return layout(
        f"Masthead — {SITE['name']}",
        "The Press masthead, editorial standards, source notes, and corrections policy.",
        "authors.html",
        "page-authors page-pledge",
        main,
        current_aux="authors.html",
        jsonld=jsonld_org(),
    )

    main = """
<main class="page page-pledge__main">

<section class="pledge-hero">
  <div class="pledge-hero__copy">
    <p class="pledge-kicker">AI Newsroom Pledge</p>
    <h1>
      <span>AI-generated journalism,</span>
      <span>disclosed upfront.</span>
    </h1>
    <p class="pledge-hero__dek">
      The Press uses Intelligent AI to draft articles, organize research, and help turn source material
      into readable stories. A human editor reviews the work before publication. The source trail stays visible.
      <strong>Read at your own risk. Form your own conclusions.</strong>
    </p>
    <div class="pledge-hero__actions" aria-label="Pledge links">
      <a class="pledge-btn pledge-btn--primary" href="archive.html">Read the latest stories</a>
      <a class="pledge-btn pledge-btn--ghost" href="gallery.html">Open gallery</a>
    </div>
  </div>

  <aside class="pledge-card" aria-label="AI disclosure summary">
    <p class="pledge-card__label">Disclosure</p>
    <div class="pledge-seal" aria-hidden="true">
      <div class="pledge-seal__ring">
        <span class="pledge-seal__eyebrow">AI</span>
        <strong>The Press</strong>
        <span class="pledge-seal__subline">Newsroom</span>
      </div>
      <div class="pledge-seal__chips">
        <span>Written with AI</span>
        <span>Human reviewed</span>
        <span>Source heavy</span>
      </div>
    </div>
    <p>
      No hidden ghostwriter. No fake staff card. No mystery box pretending to be a newsroom because apparently
      that is where the internet has decided to spend its retirement.
    </p>
  </aside>

  <ul class="pledge-stats" role="list">
    <li>
      <strong>AI-drafted</strong>
      <span>Stories begin with Intelligent AI, not a fake human byline.</span>
    </li>
    <li>
      <strong>Editor-gated</strong>
      <span>A human review pass decides what ships and what gets killed.</span>
    </li>
    <li>
      <strong>Source-heavy</strong>
      <span>Articles are built to be checked, challenged, and corrected.</span>
    </li>
  </ul>
</section>

<section class="pledge-statement">
  <p class="pledge-kicker">The Pledge</p>
  <h2>We will tell you how this paper is made before asking you to trust it.</h2>
  <div class="pledge-prose">
    <p>
      The Press is built around AI-generated drafts and human editorial judgment. That is not a shameful footnote.
      It is the central fact of the publication. The machine helps with speed, structure, synthesis, and first drafts.
      The editor is responsible for what appears on the page.
    </p>
    <p>
      AI can write clean sentences while being confidently wrong, which is a charming little nightmare humanity invented
      and then connected to every workplace. So our standard is simple: no claim should stand unless it can be traced
      back to a source, a record, a dataset, a direct statement, or a clearly labeled inference.
    </p>
    <p>
      We are not asking you to believe the article because the prose sounds polished. We are asking you to inspect the
      evidence, follow the links, compare the claims, and decide for yourself.
    </p>
  </div>
</section>

<section class="pledge-workflow" aria-labelledby="workflow-title">
  <div class="pledge-section-head">
    <p class="pledge-kicker">Behind the Scenes</p>
    <h2 id="workflow-title">What happens before an article goes live.</h2>
    <p>The glossy page is the end of the process. The work underneath is less glamorous and much more important.</p>
  </div>

  <ol class="pledge-workflow__list" role="list">
    <li class="pledge-step">
      <span>01</span>
      <h3>Story radar</h3>
      <p>We look for subjects where the public record has moved: official releases, data, filings, studies, transcripts, and credible reporting.</p>
    </li>
    <li class="pledge-step">
      <span>02</span>
      <h3>Source bundle</h3>
      <p>The article starts with receipts. The draft should be tied to documents the editor and reader can open, not vibes in a trench coat.</p>
    </li>
    <li class="pledge-step">
      <span>03</span>
      <h3>AI draft</h3>
      <p>Intelligent AI turns the source bundle into a structured draft, with the byline and AI disclosure treated as part of the story, not an afterthought.</p>
    </li>
    <li class="pledge-step">
      <span>04</span>
      <h3>Claim audit</h3>
      <p>Names, dates, numbers, causal claims, and quotes are checked against the source trail. Unsupported certainty gets cut.</p>
    </li>
    <li class="pledge-step">
      <span>05</span>
      <h3>Human edit</h3>
      <p>The editor reads for accuracy, tone, overreach, missing context, and the classic AI disease of sounding smarter than it has earned.</p>
    </li>
    <li class="pledge-step">
      <span>06</span>
      <h3>Publish with receipts</h3>
      <p>Stories keep source notes, credits, and context close to the article so readers can audit the work instead of worshiping the output.</p>
    </li>
    <li class="pledge-step">
      <span>07</span>
      <h3>Correct in public</h3>
      <p>When something is wrong, it belongs on the corrections page with a date, a plain explanation, and no theatrical fog machine.</p>
    </li>
  </ol>
</section>

<section class="pledge-receipts" aria-labelledby="receipts-title">
  <div>
    <p class="pledge-kicker">Receipts, Not Mysticism</p>
    <h2 id="receipts-title">The source trail is part of the product.</h2>
  </div>
  <div class="pledge-receipts__grid">
    <article>
      <h3>Primary records first</h3>
      <p>Government documents, datasets, court records, transcripts, official statements, and original research carry more weight than commentary.</p>
    </article>
    <article>
      <h3>Links readers can follow</h3>
      <p>The goal is not to sound authoritative. The goal is to make the authority checkable by someone who does not work here.</p>
    </article>
    <article>
      <h3>Clear uncertainty</h3>
      <p>When the evidence is partial, developing, disputed, or messy, the story should say that instead of cosplaying as a crystal ball.</p>
    </article>
  </div>
</section>

<section class="pledge-promises" aria-labelledby="promises-title">
  <div class="pledge-section-head">
    <p class="pledge-kicker">The Fine Print, Out Loud</p>
    <h2 id="promises-title">What we will do, and what we will not pretend.</h2>
  </div>

  <div class="pledge-promises__grid">
    <article class="pledge-promise pledge-promise--yes">
      <h3>We will</h3>
      <ul role="list">
        <li>Disclose AI authorship clearly on the AI Newsroom page and in publication language.</li>
        <li>Build articles around sources that can be inspected.</li>
        <li>Keep a human editor responsible for the final published page.</li>
        <li>Separate verified facts from analysis, interpretation, and uncertainty.</li>
        <li>Correct meaningful errors publicly and plainly.</li>
      </ul>
    </article>

    <article class="pledge-promise pledge-promise--no">
      <h3>We will not</h3>
      <ul role="list">
        <li>Invent quotes, sources, experts, documents, statistics, or anonymous whispers from nowhere.</li>
        <li>Pretend a model is a person with lived reporting experience.</li>
        <li>Hide the use of AI behind soft little euphemisms built by committee gremlins.</li>
        <li>Publish a claim just because the sentence sounds confident.</li>
        <li>Ask you to trust the machine. Check the machine.</li>
      </ul>
    </article>
  </div>
</section>

<section class="pledge-warning" aria-labelledby="warning-title">
  <p class="pledge-warning__stamp">Reader Advisory</p>
  <h2 id="warning-title">Read at your own risk. Form your own conclusions.</h2>
  <p>
    We can review, source, edit, label, and correct. We cannot think for you, and honestly that would be a terrible
    product feature. Treat every article as an argument with evidence attached. Open the sources. Compare the record.
    Notice what is missing. Push back when the story overreaches.
  </p>
  <p>
    A free press needs skeptical readers. An AI-generated press needs even more skeptical readers. That is not a bug.
    That is the deal.
  </p>
  <div class="pledge-warning__actions">
    <a class="pledge-btn pledge-btn--primary" href="archive.html">Archive</a>
    <a class="pledge-btn pledge-btn--ghost" href="gallery.html">Gallery</a>
    <a class="pledge-btn pledge-btn--ghost" href="index.html">Front page</a>
  </div>
</section>

<section class="pledge-sign">
  <p>Signed on behalf of a publication that would rather disclose the machine than sell you a fake human halo.</p>
  <strong>The Editor, The Press</strong>
  <span>April 2026</span>
</section>

</main>
""".strip()

    return layout(
        f"AI Newsroom Pledge — {SITE['name']}",
      "How The Press uses Intelligent AI, human editorial review, heavy sourcing, and reader skepticism.",
        "authors.html",
        "page-authors page-pledge",
        main,
        current_aux="authors.html",
        jsonld=jsonld_org(),
    )

def render_story(story: dict) -> str:
    body_html = read_fragment(story["bodyFile"])
    gallery_html = gallery_block(story)
    related_html = related_block(story)
    social_bottom_html = social_embeds_block(story, "bottom")
    body_extras = "\n        ".join(block for block in (gallery_html, social_bottom_html, related_html) if block)
    body_extra_html = f"\n        {body_extras}" if body_extras else ""
    hero_image = story.get("heroImage") or story["image"]
    hero_image_width = story.get("heroImageWidth") or story.get("imageWidth")
    hero_image_height = story.get("heroImageHeight") or story.get("imageHeight")
    hero_alt = public_image_alt(story, story["title"])
    hero_caption = public_image_caption(story)
    hero_caption_html = f"\n        <figcaption>{hero_caption}</figcaption>" if hero_caption else ""
    design_key = story_article_design(story)
    latest_five = is_latest_five_story(story)
    cartel_flagship = str(story.get("filename") or "").strip() == CARTEL_FLAGSHIP_FILENAME
    folio_html = render_article_folio(story)
    body_has_feature_rails = "press-social-feature" in body_html
    companion_rail_html = "" if body_has_feature_rails else render_article_companion_rail(story, design_key)
    companion_rail_slot = f"\n      {companion_rail_html}" if companion_rail_html else ""
    static_interactive = story.get("staticInteractive") if isinstance(story.get("staticInteractive"), dict) else {}
    static_css = str(static_interactive.get("css") or "").strip()
    static_js = str(static_interactive.get("js") or "").strip()
    extra_links = (
        f'<link rel="stylesheet" href="{h(static_css)}?v={h(asset_version(static_css))}" />'
        if static_css
        else ""
    )
    extra_scripts = (
        f'<script src="{h(static_js)}?v={h(asset_version(static_js))}" defer></script>'
        if static_js
        else ""
    )
    spread_variant = story_spread_variant(story)
    spread_value = f"v{spread_variant}" if spread_variant else ""
    article_class_list = [
        "article",
        "article--newspaper",
    ]
    body_class_list = [
        "article-body",
        "article-body--newspaper",
    ]
    article_attrs = [f'data-article-design="{h(design_key)}"']
    body_spread_attr = ' data-article-body'
    if spread_variant:
        article_class_list.extend(["article--spread", f"article--spread-v{spread_variant}"])
        body_class_list.append("article-body--spread")
        article_attrs.append(f'data-article-spread="{spread_value}"')
        body_spread_attr += f' data-article-spread="{spread_value}"'
    article_class_list.extend(["article--heritage", f"article--heritage-{design_key}"])
    body_class_list.append("article-body--heritage")
    if latest_five:
        article_class_list.append("article--latest-five")
    if cartel_flagship:
        article_class_list.append("article--cartel-flagship")
    article_classes = " ".join(article_class_list)
    body_classes = " ".join(body_class_list)
    article_attr_html = f" {' '.join(article_attrs)}" if article_attrs else ""
    main = f"""
<main class="page page-article">
  <article class="{article_classes}"{article_attr_html}>
    <header class="article-hero">
      {folio_html}
      <h1 class="article-headline">{h(story.get('displayTitle') or story['title'])}</h1>
      <p class="article-dek">{h(story['dek'])}</p>
      <div class="article-meta">
        <span>{h(public_byline(story))}</span>
        <span>Published {h(story['publishedLabel'])}</span>
        <span>Updated {h(story['updatedLabel'])}</span>
      </div>
      <figure class="hero-figure">
        <img src="{h(hero_image)}" alt="{h(hero_alt)}" loading="eager" decoding="async"{f' width="{hero_image_width}"' if hero_image_width else ''}{f' height="{hero_image_height}"' if hero_image_height else ''} />{hero_caption_html}
      </figure>
    </header>
    <div class="article-shell">
      <div class="{body_classes}"{body_spread_attr}>
        {body_html}{body_extra_html}
      </div>{companion_rail_slot}
    </div>
  </article>
</main>
""".strip()
    return layout(
        f"{story['title']} — {SITE['name']}",
        story["dek"],
        story["filename"],
        "page-article page-article--newspaper page-article--heritage",
        main,
        current_section=story["sectionSlug"],
        jsonld=jsonld_article(story),
        include_progress=True,
        extra_links=extra_links,
        extra_scripts=extra_scripts,
        social_image=story.get("image", ""),
        social_image_alt=hero_alt,
        social_image_width=story.get("imageWidth", ""),
        social_image_height=story.get("imageHeight", ""),
        og_type="article",
        social_title=story["title"],
        show_header=False,
    )


def render_404() -> str:
    main = f"""
<main class="page">
  <section class="page-hero">
    <p class="eyebrow">Not found</p>
    <h1>This page is not in the edition.</h1>
    <p class="section-copy">The link may be old, mistyped, or from a previous build. Head back to the front page or open the archive.</p>
    <div class="button-row">
      <a class="button" href="index.html">Front page</a>
      <a class="button button--ghost" href="archive.html">Archive</a>
    </div>
  </section>
</main>
""".strip()
    return layout(f"404 — {SITE['name']}", "The Press page not found.", "404.html", "page-404", main, jsonld=jsonld_org())


def render_feed() -> str:
    items = []
    for story in STORIES[:20]:
        dt = datetime.fromisoformat(story["publishedIso"])
        items.append(
            f"""
<item>
  <title>{html.escape(story['title'])}</title>
  <link>{html.escape(absolute_url(story['filename']))}</link>
  <guid>{html.escape(absolute_url(story['filename']))}</guid>
  <pubDate>{format_datetime(dt)}</pubDate>
  <description>{html.escape(story['dek'])}</description>
</item>
""".strip()
        )
    build_date = format_datetime(BUILD_REFERENCE_DT)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{html.escape(SITE['name'])}</title>
    <link>{html.escape(absolute_url('index.html'))}</link>
    <description>{html.escape(SITE['description'])}</description>
    <lastBuildDate>{build_date}</lastBuildDate>
    {' '.join(items)}
  </channel>
</rss>
"""


def render_sitemap() -> str:
    urls = ['index.html', 'archive.html', 'gallery.html', 'authors.html', 'about.html', 'photo-workflow.html', '404.html']
    urls += [section["filename"] for section in SECTIONS]
    urls += below_fold_sitemap_paths()
    urls += [story["filename"] for story in STORIES]
    urlset = []
    for path in urls:
        story = STORY_BY_FILE.get(path)
        modified = parse_iso_datetime(story.get("updatedIso") or story.get("publishedIso")) if story else below_fold_lastmod(path)
        lastmod = (modified or BUILD_REFERENCE_DT).date().isoformat()
        urlset.append(f"<url><loc>{html.escape(absolute_url(path))}</loc><lastmod>{lastmod}</lastmod></url>")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  {' '.join(urlset)}
</urlset>
"""


def sanitize_public_html(markup: str) -> str:
    markup = re.sub(
        r'\s*<aside\b[^>]*class="[^"]*\barticle-aside\b[^"]*"[^>]*>\s*<div\b[^>]*class="[^"]*\bsticky-stack\b[^"]*"[^>]*>[\s\S]*?</div>\s*</aside>\s*',
        "\n",
        markup,
        flags=re.I,
    )
    markup = re.sub(
        r'\s*<aside\b[^>]*class="[^"]*\barticle-aside\b[^"]*"[^>]*>[\s\S]*?</aside>\s*',
        "\n",
        markup,
        flags=re.I,
    )
    markup = re.sub(
        r"<figcaption\b[^>]*>[^<]*(?:AI[- ]generated|not a documentary|not documentary evidence|official FIFA image|real social-media screenshot)[\s\S]*?</figcaption>",
        "",
        markup,
        flags=re.I,
    )
    markup = re.sub(
        r'<section class="article-trust-card"[\s\S]*?</section>\s*',
        "",
        markup,
        flags=re.I,
    )
    markup = re.sub(
        r'<section class="press-living-dock"[\s\S]*?</section>\s*',
        "",
        markup,
        flags=re.I,
    )
    markup = re.sub(
        r'<section class="info-box press-living-sidecar"[\s\S]*?</section>\s*',
        "",
        markup,
        flags=re.I,
    )
    markup = re.sub(r"Written and Researched by AI", "By The Press", markup, flags=re.I)
    markup = re.sub(r"Written with AI", "Sourced", markup, flags=re.I)
    markup = re.sub(r"Intelligent AI", "The Press", markup, flags=re.I)
    markup = re.sub(r"AI Newsroom", "Masthead", markup, flags=re.I)
    markup = re.sub(r"AI Powered News", "AI Powered Journalism", markup, flags=re.I)
    markup = re.sub(r"AI powered reporting", "source-forward reporting", markup, flags=re.I)
    markup = re.sub(r"Latest AI Edition", "Latest Edition", markup, flags=re.I)
    markup = re.sub(r"Transparent AI-generated journalism", "Source-forward journalism", markup, flags=re.I)
    markup = re.sub(r"AI-generated journalism", "Source-forward journalism", markup, flags=re.I)
    markup = re.sub(r"AI-assisted editorial workflow", "reported editorial standard", markup, flags=re.I)
    markup = re.sub(r"\ban reported editorial standard\b", "a reported editorial standard", markup, flags=re.I)
    markup = re.sub(r"human review expectations", "correction expectations", markup, flags=re.I)
    markup = re.sub(r"Human reviewed", "Edited", markup, flags=re.I)
    markup = re.sub(r"AI-generated editorial thumbnail for:\s*", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated editorial illustration for:\s*", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated image by The Press\.?", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated photorealistic editorial image of\s+", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated editorial image of\s+", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated photorealistic split-level\s+", "", markup, flags=re.I)
    markup = re.sub(r"AI-generated editorial composite showing\s+", "Image showing ", markup, flags=re.I)
    markup = re.sub(r"AI-generated[^.<]*(?:\.|$)", "", markup, flags=re.I)
    markup = re.sub(r"Not a documentary[^.<]*(?:\.|$)", "", markup, flags=re.I)
    markup = re.sub(r"No API\. Static story, live browser tools\.", "", markup, flags=re.I)
    return markup


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".html":
        content = sanitize_public_html(content)
    path.write_text(content, encoding="utf-8")


def sanitize_existing_html_outputs() -> None:
    paths = list(SITE_DIR.glob("*.html"))
    daily_dir = SITE_DIR / "daily"
    if daily_dir.exists():
        paths.extend(daily_dir.glob("*.html"))
    below_fold_dir = SITE_DIR / "below-the-fold"
    if below_fold_dir.exists():
        paths.extend(below_fold_dir.glob("*.html"))
    for path in paths:
        try:
            original = path.read_text(encoding="utf-8")
        except OSError:
            continue
        cleaned = sanitize_public_html(original)
        if cleaned != original:
            path.write_text(cleaned, encoding="utf-8")


def build() -> None:
    if richer_existing_search_index() and not env_flag("PRESS_ALLOW_LEGACY_MASTER_BUILD"):
        raise SystemExit(
            "Refusing to run the legacy master-edition build over the richer live site index. "
            "Run tools/build_press_ecosystem.py for current live indexes, or set "
            "PRESS_ALLOW_LEGACY_MASTER_BUILD=1 if you intentionally want the older master-only rebuild."
        )
    write_file(SITE_DIR / "index.html", render_homepage())
    write_file(SITE_DIR / "archive.html", render_archive())
    write_file(SITE_DIR / "gallery.html", render_gallery())
    write_file(SITE_DIR / "authors.html", render_authors())
    write_file(SITE_DIR / BELOW_FOLD_NEWSSTAND_URL, render_below_fold_newsstand())
    for issue in BELOW_FOLD_ISSUES:
        write_file(SITE_DIR / issue["url"], render_below_fold_issue_page(issue))
    for section in SECTIONS:
        write_file(SITE_DIR / section["filename"], render_section(section))
    for story in STORIES:
        write_file(SITE_DIR / story["filename"], render_story(story))
    write_file(SITE_DIR / "404.html", render_404())
    write_file(SITE_DIR / "edition.json", json.dumps(edition_export(), indent=2, ensure_ascii=False) + "\n")
    write_file(SITE_DIR / "search-index.json", json.dumps(search_index(), indent=2, ensure_ascii=False) + "\n")
    write_file(SITE_DIR / "photo-records.json", json.dumps(photo_records(), indent=2, ensure_ascii=False) + "\n")
    write_file(SITE_DIR / "feed.xml", render_feed())
    write_file(SITE_DIR / "sitemap.xml", render_sitemap())
    sanitize_existing_html_outputs()
    validate_below_fold_build_outputs()


if __name__ == "__main__":
    build()
