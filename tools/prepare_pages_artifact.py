#!/usr/bin/env python3
"""Build the minimal static artifact uploaded to GitHub Pages."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "_site"
DEFAULT_MAX_BYTES = 950_000_000

ROOT_SUFFIXES = {
    ".avif",
    ".css",
    ".html",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".png",
    ".svg",
    ".txt",
    ".webmanifest",
    ".webp",
    ".xml",
}

ROOT_SPECIAL_FILES = {".nojekyll", "CNAME"}
PUBLIC_DIRECTORIES = ("assets", "below-the-fold", "daily", "data")
EXCLUDED_DIRECTORY_PARTS = {
    "__pycache__",
    "drafts",
    "illustrated-landscape-archive",
    "on-this-day-images",
    "photoreal-archive",
    "rail-imagegen-sheets",
    "source-illustrations",
}
EXCLUDED_FILE_NAMES = {".DS_Store"}


def should_copy(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if path.name in EXCLUDED_FILE_NAMES:
        return False
    return not any(part in EXCLUDED_DIRECTORY_PARTS for part in relative.parts)


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_public_directory(name: str, output: Path) -> None:
    source_root = ROOT / name
    if not source_root.exists():
        return
    for source in source_root.rglob("*"):
        if not source.is_file() or not should_copy(source):
            continue
        copy_file(source, output / source.relative_to(ROOT))


def artifact_stats(output: Path) -> tuple[int, int]:
    files = [path for path in output.rglob("*") if path.is_file()]
    return len(files), sum(path.stat().st_size for path in files)


def build_artifact(output: Path, max_bytes: int) -> tuple[int, int]:
    resolved = output.resolve()
    if resolved == ROOT or ROOT not in resolved.parents:
        raise SystemExit("Output must be a dedicated directory inside the repository.")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    for source in ROOT.iterdir():
        if not source.is_file():
            continue
        if source.name in ROOT_SPECIAL_FILES or source.suffix.lower() in ROOT_SUFFIXES:
            copy_file(source, output / source.name)

    for directory in PUBLIC_DIRECTORIES:
        copy_public_directory(directory, output)

    file_count, total_bytes = artifact_stats(output)
    if total_bytes > max_bytes:
        raise SystemExit(
            f"Pages artifact is {total_bytes:,} bytes, above the {max_bytes:,}-byte budget."
        )
    return file_count, total_bytes


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    file_count, total_bytes = build_artifact(output, args.max_bytes)
    print(f"Prepared {file_count:,} files ({total_bytes:,} bytes) in {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
