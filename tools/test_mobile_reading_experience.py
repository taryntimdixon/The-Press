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


def test_frontpage_content_routes():
    from html.parser import HTMLParser
    class Links(HTMLParser):
        def __init__(self):
            super().__init__()
            self.paths = []
        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key in ("src", "href") and value and not value.startswith(("http", "#", "mailto:", "data:")):
                    self.paths.append(value.split("?")[0].split("#")[0])
    index = source(INDEX_PATH)
    parser = Links()
    parser.feed(index)
    assert all((ROOT / path).is_file() for path in parser.paths), [path for path in parser.paths if not (ROOT / path).is_file()]
    assert 'src="app.js' not in index
    assert 'data-below-fold-package=' not in index
    assert 'section-cartoons.html' not in index
    registry = json.loads(source(ILLUSTRATED_FICTION_REGISTRY_PATH))["entries"]
    for entry in registry:
        assert f'href="{entry["href"]}"' in index
        assert f'src="{entry["image"]}"' in index
        assert html.escape(entry["teaser"], quote=True) in index
        assert not any(html.escape(paragraph, quote=True) in index for paragraph in entry["story"])
    history = json.loads(source(ROOT / "data/frontpage-history.json"))
    assert len(history) == 365
    assert all((ROOT / entry["image"].split("?")[0]).is_file() for entry in history.values() if entry["image"])
    print("✓ Front page routes, supplied art, and all 365 history images resolve locally")


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
        timeout=180,
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
    test_frontpage_content_routes()
    test_mobile_interactions_in_browser()
    print("\n✅ All source and browser reading checks passed!")


if __name__ == "__main__":
    main()
