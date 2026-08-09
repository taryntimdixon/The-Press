#!/usr/bin/env python3
"""Source-contract and browser-runtime checks for the mobile reading experience."""

from __future__ import annotations

import json
import html
import re
import runpy
import shutil
import subprocess
from functools import cache
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / "app.js"
STYLES_PATH = ROOT / "styles.css"
HOMEPAGE_STYLES_PATH = ROOT / "homepage.css"
HOMEPAGE_SCRIPT_PATH = ROOT / "homepage.js"
BUILD_PATH = ROOT / "build.py"
INDEX_PATH = ROOT / "index.html"
RUNTIME_TEST_PATH = ROOT / "tools" / "test_mobile_reading_experience_runtime.js"
ILLUSTRATED_FICTION_REGISTRY_PATH = ROOT / "data" / "illustrated-fiction.json"


@cache
def source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_inline_zoom_targets_full_page_art_only():
    app = source(APP_PATH)

    assert "INLINE_ARTICLE_IMAGE_SELECTOR" in app
    assert ".ny-love-letter-feature .ny-love-newspaper-sheet > img" in app
    assert ".press-image-edition .press-image-edition__sheet > img" in app
    assert "image.dataset.pressInlineImageZoom = 'true'" in app
    print("✓ NYC and image-edition sheets are identified for mobile page zoom")


def test_illustrated_editions_keep_native_pinch_and_restore_inline_double_tap():
    app = source(APP_PATH)
    styles = source(STYLES_PATH)
    pointer_handler = re.search(
        r"document\.addEventListener\('pointerdown', \(event\) => \{(?P<body>.*?)\n  }, \{ capture: true, passive: false \}\);",
        app,
        flags=re.DOTALL,
    )
    touch_handler = re.search(
        r"document\.addEventListener\('touchstart', \(event\) => \{(?P<body>.*?)\n  }, \{ capture: true, passive: true \}\);",
        app,
        flags=re.DOTALL,
    )
    click_classifier = re.search(
        r"function isTouchGeneratedInlineArticleImageClick\(image, event\) \{(?P<body>.*?)\n  }",
        app,
        flags=re.DOTALL,
    )
    touch_rule = re.search(
        r'\[data-press-inline-image-zoom="true"\]\s*\{(?P<body>.*?)\n\}',
        styles,
        flags=re.DOTALL,
    )

    assert pointer_handler, "Missing illustrated-edition pointer handler"
    assert "articleImagePointers.set" in pointer_handler.group("body")
    assert "points.length >= 2" in pointer_handler.group("body")
    assert "state?.image === image" in pointer_handler.group("body")
    assert "handleInlineArticleImageTap" in app
    assert "openInlineArticleImageZoom" in app
    assert "rememberInlineArticleImageTouch" in pointer_handler.group("body")
    assert touch_handler, "Missing passive touchstart fallback"
    assert "rememberInlineArticleImageTouch" in touch_handler.group("body")
    assert "preventDefault" not in touch_handler.group("body")
    assert click_classifier, "Missing touch-generated click classifier"
    assert "event.pointerType === 'touch'" in click_classifier.group("body")
    assert "event.sourceCapabilities?.firesTouchEvents" in click_classifier.group("body")
    assert "event.detail" not in click_classifier.group("body")
    assert "shouldUseTouchImageBehavior" not in click_classifier.group("body")
    assert "preventDefault" not in click_classifier.group("body")
    assert "&& isTouchGeneratedInlineArticleImageClick(image, event)" in app
    assert touch_rule, "Missing illustrated-edition touch-action rule"
    assert "touch-action:auto" in touch_rule.group("body")
    print("✓ Illustrated editions keep native pinch at rest and guarantee inline double-tap zoom")


def test_mobile_homepage_uses_one_scrim_not_two():
    styles = source(HOMEPAGE_STYLES_PATH)
    mobile = re.search(r"@media \(max-width: 44rem\) \{(?P<body>.*)\n}\s*\n@media", styles, flags=re.DOTALL)
    assert mobile, "Missing mobile homepage breakpoint"
    body_rule = re.search(
        r"body\.page-home \.lead-panel__body \{(?P<body>.*?)\n  }",
        mobile.group("body"),
        flags=re.DOTALL,
    )

    assert body_rule, "Missing mobile lead-panel body rule"
    assert "background: transparent" in body_rule.group("body")
    assert "rgba(18, 17, 15, 0.94)" not in body_rule.group("body")
    image_rule = re.search(
        r"body\.page-home \.lead-panel__media img \{(?P<body>.*?)\n  }",
        mobile.group("body"),
        flags=re.DOTALL,
    )
    assert image_rule, "Missing mobile hero-image alignment rule"
    assert "object-position: center top" in image_rule.group("body")
    print("✓ Mobile heroes keep one scrim and start full artwork at the top edge")


def test_below_fold_is_not_hidden_by_a_whole_section_reveal():
    script = source(HOMEPAGE_SCRIPT_PATH)
    reveal_selector = re.search(
        r"const revealTargets = Array\.from\(document\.querySelectorAll\(\s*\"(?P<selector>[^\"]+)\"",
        script,
    )

    assert reveal_selector, "Missing homepage reveal target selector"
    assert ".below-fold-flipper" not in reveal_selector.group("selector")
    print("✓ Below the Fold cannot become a full-height invisible mobile section")


def test_illustrated_fiction_framework_replaces_cartoon_desk():
    build = source(BUILD_PATH)
    index = source(INDEX_PATH)
    styles = source(HOMEPAGE_STYLES_PATH)
    script = source(HOMEPAGE_SCRIPT_PATH)
    section_match = re.search(
        r'<section class="home-illustrated-fiction"[^>]*>(?P<body>.*?)</section>',
        index,
        flags=re.DOTALL,
    )

    assert "render_home_cartoons" not in build
    assert "home-cartoons" not in index
    assert "home-cartoons" not in styles
    assert "home-cartoons" not in script
    assert "render_home_illustrated_fiction" in build
    assert section_match, "Missing illustrated-fiction homepage section"
    section = section_match.group("body")
    registry_entries = json.loads(source(ILLUSTRATED_FICTION_REGISTRY_PATH)).get("entries", [])
    expected_placeholders = max(0, 5 - len(registry_entries))
    assert section.count("data-illustrated-fiction-entry") == len(registry_entries)
    assert section.count("data-illustrated-fiction-slot") == expected_placeholders
    assert section.count('data-art-status="awaiting-user-art"') == expected_placeholders
    assert section.count("<img") == len(registry_entries)
    assert section.count('<h2 id="fantasy-title">Fantasy</h2>') == 1
    assert "Drawn Worlds" not in section
    assert "section-cartoons.html" not in section
    visible_text = re.sub(r"<[^>]+>", "", section).strip()
    if not registry_entries:
        assert visible_text == "Fantasy", "Fantasy must be the section's only visible copy before content is supplied"
    else:
        for entry in registry_entries:
            assert f'data-illustrated-fiction-entry="{entry["id"]}"' in section
            assert f'src="{entry["image"]}"' in section
            assert f'<h3>{entry["title"]}</h3>' in section
            assert f'href="{entry["href"]}"' in section
            assert entry["teaser"] in section
            assert all(paragraph not in section for paragraph in entry["story"])
            reading_page = source(ROOT / entry["href"])
            assert f'data-illustrated-fiction-reading="{entry["id"]}"' in reading_page
            escaped_story = [html.escape(paragraph, quote=True) for paragraph in entry["story"]]
            assert reading_page.index(f'src="{entry["image"]}"') < reading_page.index(escaped_story[0])
            assert all(paragraph in reading_page for paragraph in escaped_story)
            copy = " ".join([entry["teaser"], *entry["story"]]).lower()
            forbidden_art_premise = ("portrait", "illustration", "artwork", "paper", "painting", "painted", "drawing", "artist", "canvas", "image-making")
            assert all(term not in copy for term in forbidden_art_premise)
            reading_header = re.search(r'<header class="fantasy-reading__header">(?P<body>.*?)</header>', reading_page, flags=re.DOTALL)
            assert reading_header and re.sub(r"<[^>]+>", "", reading_header.group("body")).strip() == entry["title"]
    print("✓ Fantasy replaces the Cartoon Desk and follows the scalable archive registry")


def test_illustrated_fiction_archive_has_no_five_item_cap():
    build = source(BUILD_PATH)
    styles = source(HOMEPAGE_STYLES_PATH)
    schema = json.loads(source(ROOT / "data" / "illustrated-fiction.schema.json"))
    build_namespace = runpy.run_path(str(BUILD_PATH))
    render = build_namespace["render_home_illustrated_fiction"]
    entries = [
        {
            "id": f"future-entry-{index}",
            "title": "Future entry",
            "image": "assets/future-entry.jpg",
            "imageAlt": "Future supplied artwork",
            "aspectRatio": "1:1",
            "href": f"fantasy-future-entry-{index}.html",
            "teaser": "Future supplied teaser",
            "story": ["Future supplied story"],
        }
        for index in range(12)
    ]
    rendered = render(entries)
    art_rule = re.search(
        r"body\.page-home \.illustrated-fiction-slot__art \{(?P<body>.*?)\n\}",
        styles,
        flags=re.DOTALL,
    )
    image_rule = re.search(
        r"body\.page-home \.illustrated-fiction-entry__art img \{(?P<body>.*?)\n\}",
        styles,
        flags=re.DOTALL,
    )

    assert rendered.count("data-illustrated-fiction-entry") == 12
    assert "data-art-status=\"awaiting-user-art\"" not in rendered
    assert "ILLUSTRATED_FICTION_LAYOUT_SEQUENCE" not in build
    assert "illustrated_fiction_layout" not in build
    for haystack in (rendered, styles):
        for variant in ("lead", "standard", "wide"):
            assert f"illustrated-fiction-slot--{variant}" not in haystack
    assert art_rule and "aspect-ratio: 1 / 1" in art_rule.group("body")
    assert image_rule and "object-fit: contain" in image_rule.group("body")
    assert "position: absolute" in image_rule.group("body")
    assert "inset: 0" in image_rule.group("body")
    assert "grid-template-columns: repeat(3, minmax(0, 1fr))" in styles
    item_properties = schema["properties"]["entries"]["items"]["properties"]
    assert "layout" not in item_properties
    assert "story" in schema["properties"]["entries"]["items"]["required"]
    assert item_properties["aspectRatio"]["const"] == "1:1"
    print("✓ Fantasy stays uncapped as a compact square gallery with separate reading views")


def test_homepage_section_navigation_uses_existing_named_sections():
    index = source(INDEX_PATH)
    styles = source(HOMEPAGE_STYLES_PATH)
    nav_match = re.search(
        r'<nav class="home-section-nav"[^>]*>(?P<body>.*?)</nav>',
        index,
        flags=re.DOTALL,
    )

    assert nav_match, "Missing homepage section navigation"
    nav = nav_match.group("body")
    expected = {
        '#front-page': 'Front Page',
        '#more-from-edition': 'More from the Edition',
        '#on-this-day': 'On This Day',
        '#below-the-fold': 'Below the Fold',
        '#fantasy': 'Fantasy',
    }
    for href, label in expected.items():
        assert f'href="{href}"' in nav
        assert f'id="{href[1:]}"' in index
        assert label in nav
    assert 'href="#illustrated-fiction"' not in nav
    assert "position: sticky" in styles
    assert "overflow-x: auto" in styles
    assert "getBoundingClientRect().top <= activationLine" in source(HOMEPAGE_SCRIPT_PATH)
    print("✓ Homepage section navigation exposes all five named sections with position-based scroll tracking")


def find_node() -> str:
    candidates = [
        shutil.which("node"),
        str(
            Path.home()
            / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
        ),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise AssertionError(
        "Node is required for the mobile browser runtime test; no executable was found"
    )


def test_mobile_interactions_in_browser():
    result = subprocess.run(
        [find_node(), str(RUNTIME_TEST_PATH)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=60,
        check=False,
    )
    if result.returncode:
        details = "\n".join(part for part in (result.stdout, result.stderr) if part)
        raise AssertionError(f"Mobile browser runtime test failed:\n{details}")
    print(result.stdout.rstrip())


def main():
    print("Running mobile reading experience checks...\n")
    test_inline_zoom_targets_full_page_art_only()
    test_illustrated_editions_keep_native_pinch_and_restore_inline_double_tap()
    test_mobile_homepage_uses_one_scrim_not_two()
    test_below_fold_is_not_hidden_by_a_whole_section_reveal()
    test_illustrated_fiction_framework_replaces_cartoon_desk()
    test_illustrated_fiction_archive_has_no_five_item_cap()
    test_homepage_section_navigation_uses_existing_named_sections()
    test_mobile_interactions_in_browser()
    print("\n✅ All 8 mobile reading experience checks passed!")


if __name__ == "__main__":
    main()
