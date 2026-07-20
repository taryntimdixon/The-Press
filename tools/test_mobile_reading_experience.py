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
    print("✓ NYC and image-edition sheets opt into mobile inline zoom")


def test_touch_taps_stay_inline_and_single_tap_is_a_noop():
    app = source(APP_PATH)
    handler = re.search(
        r"function handleInlineArticleImageTap\(.*?\n  }\n",
        app,
        flags=re.DOTALL,
    )

    assert handler, "Missing inline article image tap handler"
    assert "openInlineArticleImageZoom" in handler.group(0)
    assert "openImageLightbox" not in handler.group(0)
    assert "setTimeout" not in handler.group(0)
    assert "closeInlineArticleImageZoom" in handler.group(0)
    print("✓ Touch double-tap zooms/resets inline without a delayed modal open")


def test_inline_zoom_uses_exact_focal_math_and_eight_x_range():
    app = source(APP_PATH)

    assert "INLINE_IMAGE_MAX_ZOOM = 8" in app
    assert "(center.x - state.panX) / state.zoom" in app
    assert "(center.y - state.panY) / state.zoom" in app
    assert "state.panX = center.x - (focal.x * nextZoom)" in app
    assert "state.panY = center.y - (focal.y * nextZoom)" in app
    assert "INLINE_IMAGE_PAN_SENSITIVITY" in app
    print("✓ Inline zoom preserves the touched focal point and permits up to 8x zoom")


def test_inline_zoom_css_preserves_scroll_until_active():
    styles = source(STYLES_PATH)

    assert '[data-press-inline-image-zoom="true"]' in styles
    assert "touch-action:pan-y" in styles
    assert ".press-inline-image-zoom.is-active" in styles
    assert "touch-action:none" in styles
    assert ".press-inline-image-zoom__done" in styles
    print("✓ Mobile sheets scroll normally until their inline zoom is active")


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
    print("✓ Mobile homepage no longer stacks a second dark scrim over hero art")


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
    test_touch_taps_stay_inline_and_single_tap_is_a_noop()
    test_inline_zoom_uses_exact_focal_math_and_eight_x_range()
    test_inline_zoom_css_preserves_scroll_until_active()
    test_mobile_homepage_uses_one_scrim_not_two()
    test_mobile_interactions_in_browser()
    print("\n✅ All 6 mobile reading experience checks passed!")


if __name__ == "__main__":
    main()
