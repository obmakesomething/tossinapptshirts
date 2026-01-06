#!/usr/bin/env python3
import csv
import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "customzone_products.csv"
CATALOG_OUT = ROOT / "src" / "data" / "catalog.ts"
ASSET_BASE_URL = os.environ.get("CATALOG_ASSET_BASE_URL", "").strip()

PRODUCT_ORDER = [
    "[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)",
    "[프린트스타] 188 헤비 후드 (남녀공용)",
    "[프린트스타] 183 헤비 맨투맨 (남녀공용)",
    "캔버스 에코백(35X40)",
]

PRODUCT_META = {
    "[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)": {
        "category": "티셔츠",
        "model_name": "Printstar 148 Heavy 14oz",
    },
    "[프린트스타] 188 헤비 후드 (남녀공용)": {
        "category": "후드",
        "model_name": "Printstar 188 Heavy Hoodie",
    },
    "[프린트스타] 183 헤비 맨투맨 (남녀공용)": {
        "category": "맨투맨",
        "model_name": "Printstar 183 Heavy Sweatshirt",
    },
    "캔버스 에코백(35X40)": {
        "category": "에코백",
        "model_name": "Canvas Eco Bag 35x40",
    },
}

FORCED_COLORS = ["화이트", "블랙"]


def parse_prices(raw: str):
    numbers = [int(n.replace(",", "")) for n in re.findall(r"[0-9][0-9,]*", raw)]
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], None
    return numbers[-1], numbers[0]


def parse_list(raw: str):
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_sizes(raw: str):
    sizes = []
    for item in parse_list(raw):
        extra = 0
        match = re.search(r"\(([^)]+)\)", item)
        if match:
            value = match.group(1)
            value = value.replace("₩", "").replace(",", "").replace(" ", "")
            if value.startswith("+"):
                value = value[1:]
            try:
                extra = int(value)
            except ValueError:
                extra = 0
            label = re.sub(r"\s*\([^)]*\)", "", item).strip()
        else:
            label = item
        sizes.append({"label": label, "extraPrice": extra})
    return sizes


def build_remote_url(local_path: str, fallback_url: str) -> str:
    if ASSET_BASE_URL and local_path:
        return f"{ASSET_BASE_URL.rstrip('/')}/{local_path}"
    return fallback_url


def build_catalog(rows):
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export type SizeOption = {",
        "  label: string;",
        "  extraPrice: number;",
        "};",
        "",
        "export type CatalogProduct = {",
        "  id: string;",
        "  name: string;",
        "  category: string;",
        "  modelName: string;",
        "  price: number | null;",
        "  originalPrice: number | null;",
        "  priceText: string;",
        "  url: string;",
        "  mainImage: ImageSourcePropType;",
        "  detailImage: ImageSourcePropType;",
        "  colors: string[];",
        "  sizes: SizeOption[];",
        "  tags: string[];",
        "};",
        "",
        "const resolveImage = (remoteUrl: string): ImageSourcePropType => ({ uri: remoteUrl });",
        "",
        "const formatPrice = (value: number | null) => {",
        "  if (value == null) return '';",
        "  return `₩${value.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')}`;",
        "};",
        "",
        "export const catalogProducts: CatalogProduct[] = [",
    ]

    for index, row in enumerate(rows, start=1):
        name = row["Name"]
        meta = PRODUCT_META[name]
        price, original = parse_prices(row["Price"])
        url = row["URL"]
        main_url = build_remote_url(row["Local Main Image"], row["Main Image URL"])
        detail_url = build_remote_url(row["Local Detail Images"], row["Detail Image URLs"])
        colors = FORCED_COLORS
        sizes = parse_sizes(row["Sizes"])
        tags = parse_list(row["Tags"])
        product_id = f"p-{index:03d}"
        lines.append("  {")
        lines.append(f"    id: '{product_id}',")
        lines.append(f"    name: {name!r},")
        lines.append(f"    category: {meta['category']!r},")
        lines.append(f"    modelName: {meta['model_name']!r},")
        lines.append(f"    price: {price if price is not None else 'null'},")
        lines.append(f"    originalPrice: {original if original is not None else 'null'},")
        lines.append("    priceText: formatPrice(")
        lines.append(f"      {price if price is not None else 'null'}")
        lines.append("    ),")
        lines.append(f"    url: {url!r},")
        lines.append(f"    mainImage: resolveImage({main_url!r}),")
        lines.append(f"    detailImage: resolveImage({detail_url!r}),")
        lines.append(f"    colors: {colors!r},")
        lines.append(f"    sizes: {sizes!r},")
        lines.append(f"    tags: {tags!r},")
        lines.append("  },")

    lines.append("];")
    lines.append("")
    CATALOG_OUT.write_text("\n".join(lines), encoding="utf-8")


def main():
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader if row["Name"] in PRODUCT_META]

    order_index = {name: idx for idx, name in enumerate(PRODUCT_ORDER)}
    rows.sort(key=lambda row: order_index.get(row["Name"], 999))

    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    build_catalog(rows)


if __name__ == "__main__":
    main()
