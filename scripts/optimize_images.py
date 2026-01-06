#!/usr/bin/env python3
import csv
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "customzone_products.csv"
OUTPUT_DIR = ROOT / "data" / "optimized"

PRODUCT_NAMES = {
    "[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)",
    "[프린트스타] 188 헤비 후드 (남녀공용)",
    "[프린트스타] 183 헤비 맨투맨 (남녀공용)",
    "캔버스 에코백(35X40)",
}

MAIN_MAX_PX = 900
DETAIL_MAX_PX = 1600
JPEG_QUALITY = 80


def collect_sources():
    sources = {}
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Name"] not in PRODUCT_NAMES:
                continue
            main_rel = row.get("Local Main Image", "").strip()
            detail_rel = row.get("Local Detail Images", "").strip()
            if main_rel:
                sources[main_rel] = MAIN_MAX_PX
            if detail_rel:
                sources[detail_rel] = DETAIL_MAX_PX
    return sources


def optimize_image(src: Path, dest: Path, max_px: int, sips_path: str):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        return "skipped"
    subprocess.run(
        [
            sips_path,
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            str(JPEG_QUALITY),
            "-Z",
            str(max_px),
            str(src),
            "--out",
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return "optimized"


def main():
    sips_path = shutil.which("sips")
    if not sips_path:
        print("sips not found. This script requires macOS.", file=sys.stderr)
        sys.exit(1)

    sources = collect_sources()
    if not sources:
        print("No images found for the configured products.")
        return

    optimized = 0
    skipped = 0
    for rel_path, max_px in sorted(sources.items()):
        src = ROOT / "data" / rel_path
        if not src.exists():
            print(f"missing: {rel_path}", file=sys.stderr)
            continue
        if src.suffix.lower() not in {".jpg", ".jpeg"}:
            print(f"skip non-jpg: {rel_path}")
            continue
        dest = OUTPUT_DIR / rel_path
        result = optimize_image(src, dest, max_px, sips_path)
        if result == "optimized":
            optimized += 1
        else:
            skipped += 1

    print(f"done: optimized={optimized} skipped={skipped} output={OUTPUT_DIR}")


if __name__ == "__main__":
    main()
