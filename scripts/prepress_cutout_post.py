#!/usr/bin/env python3
"""
Prepress cutout post-processing for commercial print (tshirt/sticker).

Input: RGBA image with transparent background (cutout)
Output:
  - MASTER: square PNG (default 1890x1890) with sRGB ICC, 600 DPI metadata
  - PREVIEW: square PNG (default 945x945) with sRGB ICC, 300 DPI metadata

Processing goals:
  - remove tiny islands / debris
  - fill small enclosed holes (avoid large legitimate negative space)
  - center subject with padding_ratio around it (avoid tight crop)
  - apply alpha choke (1-2px on MASTER) to reduce halos
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms
from scipy import ndimage as ndi


def _load_rgba(path: str) -> Image.Image:
    im = Image.open(path)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    return im


def _qc_alpha_ok(alpha: np.ndarray) -> bool:
    if alpha.size == 0:
        return False
    nonzero = int(np.count_nonzero(alpha > 0))
    coverage = nonzero / float(alpha.size)
    if coverage < 0.005 or coverage > 0.995:
        return False
    ys, xs = np.where(alpha > 0)
    if xs.size == 0:
        return False
    bbox_area = int((xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))
    if bbox_area / float(alpha.size) > 0.999:
        return False
    return True


def _remove_small_islands(mask: np.ndarray, *, min_area: int) -> np.ndarray:
    if not mask.any():
        return mask
    labels, num = ndi.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if num == 0:
        return mask
    counts = np.bincount(labels.ravel())
    keep = np.zeros(num + 1, dtype=bool)
    keep[0] = False
    for i in range(1, num + 1):
        if counts[i] >= min_area:
            keep[i] = True
    return keep[labels]


def _fill_small_holes(mask: np.ndarray, *, max_hole_area: int) -> np.ndarray:
    """
    Fill enclosed background "holes" inside the foreground bbox, but only if small.
    This avoids filling large intentional negative space.
    """

    if not mask.any():
        return mask
    ys, xs = np.where(mask)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())

    sub = mask[y0 : y1 + 1, x0 : x1 + 1]
    inv = ~sub
    labels, num = ndi.label(inv, structure=np.ones((3, 3), dtype=np.uint8))
    if num == 0:
        return mask

    border = np.zeros_like(inv, dtype=bool)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True

    touching = set(np.unique(labels[border]).tolist())
    counts = np.bincount(labels.ravel())

    fill = np.zeros(num + 1, dtype=bool)
    for i in range(1, num + 1):
        if i in touching:
            continue
        if counts[i] <= max_hole_area:
            fill[i] = True

    filled_sub = sub | fill[labels]
    out = mask.copy()
    out[y0 : y1 + 1, x0 : x1 + 1] = filled_sub
    return out


def _apply_mask_to_alpha(alpha: np.ndarray, mask: np.ndarray) -> np.ndarray:
    out = alpha.copy()
    out[~mask] = 0
    return out


def _bbox_from_alpha(alpha: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(alpha > 0)
    if xs.size == 0:
        return None
    x0 = int(xs.min())
    y0 = int(ys.min())
    x1 = int(xs.max()) + 1
    y1 = int(ys.max()) + 1
    return x0, y0, x1, y1


def _fit_to_square(rgba: np.ndarray, *, out_px: int, padding_ratio: float) -> np.ndarray:
    alpha = rgba[..., 3]
    bbox = _bbox_from_alpha(alpha)
    if bbox is None:
        return np.zeros((out_px, out_px, 4), dtype=np.uint8)

    x0, y0, x1, y1 = bbox
    crop = rgba[y0:y1, x0:x1, :]
    h, w = crop.shape[:2]
    max_dim = max(w, h)

    inner = max(1, int(round(out_px * (1.0 - 2.0 * padding_ratio))))
    scale = inner / float(max_dim)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    im = Image.fromarray(crop, mode="RGBA").resize((new_w, new_h), resample=Image.LANCZOS)
    canvas = Image.new("RGBA", (out_px, out_px), (0, 0, 0, 0))
    x = (out_px - new_w) // 2
    y = (out_px - new_h) // 2
    canvas.alpha_composite(im, dest=(x, y))
    return np.array(canvas)


def _choke_alpha_master(rgba: np.ndarray, *, choke_px: int) -> np.ndarray:
    if choke_px <= 0:
        return rgba
    alpha = rgba[..., 3].astype(np.uint8)
    size = 2 * choke_px + 1
    # Minimum filter (grayscale erosion) shrinks alpha without touching RGB.
    choked = ndi.minimum_filter(alpha, size=size, mode="nearest")
    out = rgba.copy()
    out[..., 3] = choked.astype(np.uint8)
    return out


def _srgb_icc_bytes() -> bytes | None:
    try:
        srgb = ImageCms.createProfile("sRGB")
        return ImageCms.ImageCmsProfile(srgb).tobytes()
    except Exception:
        return None


def _save_png_rgba(
    rgba: np.ndarray,
    *,
    path: str,
    dpi: tuple[int, int] | None,
) -> None:
    im = Image.fromarray(rgba, mode="RGBA")
    icc = _srgb_icc_bytes()
    save_kwargs: dict[str, object] = {}
    if icc:
        save_kwargs["icc_profile"] = icc
    if dpi:
        save_kwargs["dpi"] = dpi
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", **save_kwargs)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Path to RGBA cutout image (transparent background).")
    ap.add_argument("--master", required=True, help="Output MASTER PNG path (transparent alpha).")
    ap.add_argument("--preview", required=True, help="Output PREVIEW PNG path (transparent alpha).")
    ap.add_argument("--product_type", choices=["sticker", "tshirt"], default="sticker")
    ap.add_argument("--max_size_mm", type=int, default=80)
    ap.add_argument("--master_px", type=int, default=1890)
    ap.add_argument("--preview_px", type=int, default=945)
    ap.add_argument("--choke_px", type=int, default=2)
    ap.add_argument("--padding_ratio", type=float, default=0.05)
    ap.add_argument("--mask_threshold", type=int, default=4)
    args = ap.parse_args()

    im = _load_rgba(args.input)
    rgba = np.array(im)
    alpha = rgba[..., 3]

    if not _qc_alpha_ok(alpha):
        print("WARN: alpha QC looks suspicious (too empty/full). Continuing anyway.", file=sys.stderr)

    # Build a "hard" mask for cleaning; keep it conservative to avoid halos.
    mask = alpha > int(args.mask_threshold)
    if mask.any():
        labels, num = ndi.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
        counts = np.bincount(labels.ravel())
        main_area = int(counts[1:].max()) if counts.size > 1 else 0

        min_island_area = max(64, int(main_area * 0.0002))
        mask = _remove_small_islands(mask, min_area=min_island_area)

        max_hole_area = max(128, int(main_area * 0.005))
        mask = _fill_small_holes(mask, max_hole_area=max_hole_area)

    rgba[..., 3] = _apply_mask_to_alpha(alpha, mask)

    # Fit to MASTER square with padding.
    master_rgba = _fit_to_square(rgba, out_px=int(args.master_px), padding_ratio=float(args.padding_ratio))
    # Apply choke on MASTER pixels.
    master_rgba = _choke_alpha_master(master_rgba, choke_px=int(args.choke_px))
    _save_png_rgba(master_rgba, path=args.master, dpi=(600, 600))

    # PREVIEW from MASTER to keep placement identical.
    preview = (
        Image.fromarray(master_rgba, mode="RGBA")
        .resize((int(args.preview_px), int(args.preview_px)), resample=Image.LANCZOS)
    )
    preview_rgba = np.array(preview)
    _save_png_rgba(preview_rgba, path=args.preview, dpi=(300, 300))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

