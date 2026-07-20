#!/usr/bin/env python3
"""Source-contract and browser-runtime checks for the mobile reading experience."""

from __future__ import annotations

import re
import shutil
import subprocess
from functools import cache
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / "app.js"
STYLES_PATH = ROOT / "styles.css"
HOMEPAGE_STYLES_PATH = ROOT / "homepage.css"
HOMEPAGE_SCRIPT_PATH = ROOT / "homepage.js"
RUNTIME_TEST_PATH = ROOT / "tools" / "test_mobile_reading_experience_runtime.js"


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


def test_illustrated_editions_delegate_touch_zoom_to_the_browser():
    app = source(APP_PATH)
    styles = source(STYLES_PATH)
    pointer_handler = re.search(
        r"document\.addEventListener\('pointerdown', \(event\) => \{(?P<body>.*?)\n  }, \{ capture: true, passive: true \}\);",
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

    assert pointer_handler, "Missing passive illustrated-edition pointer handoff"
    assert "preventDefault" not in pointer_handler.group("body")
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
    print("✓ Illustrated editions leave pinch and double-tap zoom to the phone browser")


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
    test_illustrated_editions_delegate_touch_zoom_to_the_browser()
    test_mobile_homepage_uses_one_scrim_not_two()
    test_below_fold_is_not_hidden_by_a_whole_section_reveal()
    test_mobile_interactions_in_browser()
    print("\n✅ All 5 mobile reading experience checks passed!")


if __name__ == "__main__":
    main()
