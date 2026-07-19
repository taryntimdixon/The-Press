#!/usr/bin/env python3
"""Regression tests for the manifest-driven Mob Ties: The Files generator."""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = ROOT / "tools/build_mob_ties_the_files.py"
BUILD_PATH = ROOT / "build.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader, f"Could not load {path}"
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


generator = load_module("mob_ties_the_files_generator", GENERATOR_PATH)
site_build = load_module("mob_ties_the_files_site_build", BUILD_PATH)


def manifest() -> dict:
    return json.loads(generator.MANIFEST_PATH.read_text(encoding="utf-8"))


def test_manifest_array_order_controls_same_chapter_plate_numbers():
    """Swapping same-chapter objects must reorder plates without renamed assets."""
    source = manifest()
    first_file = source["pages"][0]["file"]
    second_file = source["pages"][1]["file"]
    source["pages"][0], source["pages"][1] = source["pages"][1], source["pages"][0]

    validated = generator.validate_manifest(source)
    rendered = generator.render_body(validated)

    assert validated["pages"][0]["file"] == second_file
    assert validated["pages"][1]["file"] == first_file
    assert validated["pages"][0]["plate"] == 1
    assert validated["pages"][1]["plate"] == 2
    assert 'id="page-1"' in rendered
    assert 'data-plate="1"' in rendered
    assert f'src="assets/mob-ties-the-files/pages/{second_file}"' in rendered
    assert f'src="assets/mob-ties-the-files/pages/{first_file}"' in rendered
    assert rendered.index(f'src="assets/mob-ties-the-files/pages/{second_file}"') < rendered.index(
        f'src="assets/mob-ties-the-files/pages/{first_file}"'
    )
    print("✓ Manifest array order controls same-chapter plate numbering")


def test_missing_asset_stops_main_before_any_output_is_written():
    """A missing WebP must fail validation before either source fragment is created."""
    source = manifest()
    source["pages"][0]["file"] = "missing-regression-asset.webp"

    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        manifest_path = tmp_path / "manifest.json"
        body_path = tmp_path / "body.html"
        aside_path = tmp_path / "aside.html"
        manifest_path.write_text(json.dumps(source), encoding="utf-8")
        original_paths = generator.MANIFEST_PATH, generator.BODY_PATH, generator.ASIDE_PATH
        generator.MANIFEST_PATH, generator.BODY_PATH, generator.ASIDE_PATH = manifest_path, body_path, aside_path
        try:
            try:
                generator.main()
                assert False, "Expected missing asset validation to stop the generator"
            except SystemExit as exc:
                assert "missing asset: missing-regression-asset.webp" in str(exc).lower()
        finally:
            generator.MANIFEST_PATH, generator.BODY_PATH, generator.ASIDE_PATH = original_paths

        assert not body_path.exists()
        assert not aside_path.exists()
    print("✓ Missing assets fail before generator output is written")


def test_duplicate_chapter_id_fails_clearly():
    """Duplicate chapter identifiers must be rejected before rendering."""
    source = manifest()
    source["chapters"][1]["id"] = source["chapters"][0]["id"]

    try:
        generator.validate_manifest(source)
        assert False, "Expected duplicate chapter id validation to fail"
    except ValueError as exc:
        assert "duplicate chapter id" in str(exc).lower()
    print("✓ Duplicate chapter ids fail clearly")


def test_empty_chapter_fails_clearly():
    """Every declared chapter must own at least one page."""
    source = manifest()
    empty_chapter = source["chapters"][-1]["id"]
    source["pages"] = [page for page in source["pages"] if page["chapter"] != empty_chapter]

    try:
        generator.validate_manifest(source)
        assert False, "Expected empty chapter validation to fail"
    except ValueError as exc:
        assert "empty chapters" in str(exc).lower()
        assert empty_chapter in str(exc)
    print("✓ Empty chapters fail clearly")


def test_rendered_images_use_real_webp_src_without_lazy_placeholder_dependency():
    """Every selected plate should render directly from its WebP asset."""
    validated = generator.validate_manifest(manifest())
    rendered = generator.render_body(validated)
    sources = re.findall(r'<img\b[^>]*\bsrc="([^"]+)"', rendered)

    assert len(sources) == len(validated["pages"])
    assert "data-press-lazy-src" not in rendered
    assert "data:image" not in rendered.lower()
    assert "transparent" not in rendered.lower()
    for page, source in zip(validated["pages"], sources):
        expected = f"assets/mob-ties-the-files/pages/{page['file']}"
        assert source == expected
        assert source.lower().endswith(".webp")
        assert (generator.PAGE_ASSET_DIR / page["file"]).is_file()
    print(f"✓ Rendered {len(sources)} images use real WebP src values without placeholders")


def test_reader_chrome_is_removed_from_continuous_plate_sequence():
    """The visual sequence should contain only connected plates."""
    rendered = generator.render_body(generator.validate_manifest(manifest()))
    sanitized = site_build.sanitize_public_html(rendered)

    assert "press-image-edition__prologue" not in sanitized
    assert "press-image-edition__chapter" not in sanitized
    assert "press-image-edition__endmatter" not in sanitized
    assert "press-image-edition__folio" not in sanitized
    assert "press-image-edition__menu" not in sanitized
    assert "press-image-edition__nav" not in sanitized
    assert sanitized.count('class="press-image-edition__page"') == len(manifest()["pages"])
    print("✓ All reader chrome stays out of the continuous plate sequence")


def test_evidence_lightbox_contract_is_scoped_to_the_dossier():
    """The dossier should opt into its dark lightbox and connected-roll treatment explicitly."""
    rendered = generator.render_body(generator.validate_manifest(manifest()))
    styles = (ROOT / "styles.css").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")

    assert "press-image-edition--evidence-lightbox" in rendered
    assert ".press-image-edition--archive.press-image-edition--evidence-lightbox" in styles
    assert "const evidenceLightbox = Boolean(document.querySelector('.press-image-edition--evidence-lightbox'))" in app
    assert "page.evidenceLightbox" in app
    print("✓ Evidence lightbox styling and connected-roll rendering stay dossier-scoped")


def main():
    """Run all generator regression tests without writing production fragments."""
    print("Running Mob Ties: The Files generator regression tests...\n")
    test_manifest_array_order_controls_same_chapter_plate_numbers()
    test_missing_asset_stops_main_before_any_output_is_written()
    test_duplicate_chapter_id_fails_clearly()
    test_empty_chapter_fails_clearly()
    test_rendered_images_use_real_webp_src_without_lazy_placeholder_dependency()
    test_reader_chrome_is_removed_from_continuous_plate_sequence()
    test_evidence_lightbox_contract_is_scoped_to_the_dossier()
    print("\n✅ All 7 tests passed!")


if __name__ == "__main__":
    main()
