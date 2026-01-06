#!/usr/bin/env python3
import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "customzone_products.csv"
ASSETS_OUT = ROOT / "src" / "data" / "catalogAssets.ts"
CATALOG_OUT = ROOT / "src" / "data" / "catalog.ts"


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


def build_assets_map(rows):
    asset_paths = []
    for row in rows:
        for key in ("Local Main Image", "Local Detail Images"):
            rel = row.get(key, "").strip()
            if not rel:
                continue
            if (ROOT / "data" / rel).exists():
                asset_paths.append(rel)
    asset_paths = sorted(set(asset_paths))

    lines = [
        "export const assetMap = {",
    ]
    for rel in asset_paths:
        require_path = f"../../data/{rel}"
        lines.append(f'  "{rel}": require("{require_path}"),')
    lines.append("} as const;")
    lines.append("")
    ASSETS_OUT.write_text("\n".join(lines), encoding="utf-8")


def build_catalog(rows):
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "import { assetMap } from './catalogAssets';",
        "",
        "export type SizeOption = {",
        "  label: string;",
        "  extraPrice: number;",
        "};",
        "",
        "export type CatalogProduct = {",
        "  id: string;",
        "  name: string;",
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
        "const resolveImage = (localPath: string, remoteUrl: string): ImageSourcePropType => {",
        "  const asset = assetMap[localPath as keyof typeof assetMap];",
        "  if (asset) return asset;",
        "  return { uri: remoteUrl };",
        "};",
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
        price, original = parse_prices(row["Price"])
        url = row["URL"]
        main_url = row["Main Image URL"]
        detail_url = row["Detail Image URLs"]
        main_local = row["Local Main Image"]
        detail_local = row["Local Detail Images"]
        colors = parse_list(row["Colors"])
        sizes = parse_sizes(row["Sizes"])
        tags = parse_list(row["Tags"])
        product_id = f"p-{index:03d}"
        lines.append("  {")
        lines.append(f"    id: '{product_id}',")
        lines.append(f"    name: {name!r},")
        lines.append(f"    price: {price if price is not None else 'null'},")
        lines.append(f"    originalPrice: {original if original is not None else 'null'},")
        lines.append("    priceText: formatPrice(")
        lines.append(f"      {price if price is not None else 'null'}")
        lines.append("    ),")
        lines.append(f"    url: {url!r},")
        lines.append(f"    mainImage: resolveImage({main_local!r}, {main_url!r}),")
        lines.append(f"    detailImage: resolveImage({detail_local!r}, {detail_url!r}),")
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
        rows = list(reader)

    ASSETS_OUT.parent.mkdir(parents=True, exist_ok=True)
    build_assets_map(rows)
    build_catalog(rows)


if __name__ == "__main__":
    main()
