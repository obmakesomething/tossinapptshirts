#!/usr/bin/env python3
"""Remove backgrounds from mockup images using rembg (local, no API key needed).
Processes all PNG mockups in assets/mockups/ and syncs to public/mockups/ and server-public/mockups/.
"""
import os
import shutil
from pathlib import Path

from PIL import Image
from rembg import remove

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets" / "mockups"
SYNC_DIRS = [
    PROJECT_ROOT / "public" / "mockups",
    PROJECT_ROOT / "server-public" / "mockups",
]

# Only process these files (hoodie + sweatshirt that need re-processing)
TARGETS = [
    "hoodie_black_front.png",
    "hoodie_grey_front.png",
    "sweatshirt_black_front.png",
    "sweatshirt_grey_front.png",
]


def process_image(src_path: Path) -> None:
    print(f"Processing {src_path.name}...")

    # Use the JPG source (original with background) if available, else PNG
    jpg_path = src_path.with_suffix(".jpg")
    input_path = jpg_path if jpg_path.exists() else src_path

    with open(input_path, "rb") as f:
        input_bytes = f.read()

    output_bytes = remove(input_bytes)

    # Save to assets
    with open(src_path, "wb") as f:
        f.write(output_bytes)

    # Check result
    result = Image.open(src_path)
    print(f"  -> {result.size}, mode={result.mode}")

    # Sync to other directories
    for sync_dir in SYNC_DIRS:
        if sync_dir.exists():
            dest = sync_dir / src_path.name
            shutil.copy2(src_path, dest)
            print(f"  -> synced to {dest.relative_to(PROJECT_ROOT)}")


def main():
    for filename in TARGETS:
        src = ASSETS_DIR / filename
        if not src.exists():
            print(f"SKIP: {filename} not found")
            continue
        process_image(src)

    print("\nDone! All mockup backgrounds re-processed.")


if __name__ == "__main__":
    main()
