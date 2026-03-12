from __future__ import annotations

import gc
import io
import os
from threading import Lock
from typing import Dict

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from PIL import Image
from rembg import new_session, remove

DEFAULT_MODEL = "birefnet-general-lite"
FALLBACK_MODEL = "birefnet-general"
LIGHT_MODEL = "birefnet-general-lite"
BRIA_MODEL = "bria-rmbg"
SUPPORTED_MODELS = {DEFAULT_MODEL, FALLBACK_MODEL, LIGHT_MODEL, BRIA_MODEL}
MODEL_ALIASES = {
    "birefnet-lite": LIGHT_MODEL,
    "bria": BRIA_MODEL,
}

app = FastAPI(title="merchandisegpt-rembg-mask", version="1.0.0")

SESSIONS: Dict[str, object] = {}
SESSIONS_LOCK = Lock()
MAX_CACHED_SESSIONS = max(0, int(os.getenv("REMBG_MAX_CACHED_SESSIONS", "0")))


def _resolve_max_input_side() -> int | None:
    raw = str(os.getenv("REMBG_MAX_INPUT_SIDE", "1280")).strip()
    try:
        value = int(raw)
    except ValueError:
        value = 1280
    if value <= 0:
        return None
    return max(256, min(4096, value))


MAX_INPUT_SIDE = _resolve_max_input_side()


def _normalize_model(raw: str | None) -> str:
    model = (raw or "").strip().lower().replace("_", "-")
    model = MODEL_ALIASES.get(model, model)
    if model in SUPPORTED_MODELS:
        return model
    return DEFAULT_MODEL


def _get_session(model: str) -> object:
    if MAX_CACHED_SESSIONS == 0:
        return new_session(model)

    cached = SESSIONS.get(model)
    if cached is not None:
        return cached
    with SESSIONS_LOCK:
        cached = SESSIONS.get(model)
        if cached is not None:
            return cached
        if len(SESSIONS) >= MAX_CACHED_SESSIONS:
            SESSIONS.clear()
            gc.collect()
        created = new_session(model)
        SESSIONS[model] = created
        return created


def _load_png_bytes(raw_image: bytes, model: str) -> bytes:
    return remove(
        raw_image,
        session=_get_session(model),
        only_mask=True,
        post_process_mask=True,
    )


def _prepare_image_for_inference(raw_image: bytes) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    try:
        with Image.open(io.BytesIO(raw_image)) as image:
            image.load()
            normalized = image.convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="invalid_image") from exc

    original_size = normalized.size
    inference_image = normalized
    if MAX_INPUT_SIDE is not None and max(original_size) > MAX_INPUT_SIDE:
        scale = MAX_INPUT_SIDE / max(original_size)
        resized = (
            max(1, int(round(original_size[0] * scale))),
            max(1, int(round(original_size[1] * scale))),
        )
        inference_image = normalized.resize(resized, Image.LANCZOS)

    encoded = io.BytesIO()
    inference_image.save(encoded, format="PNG")
    return encoded.getvalue(), original_size, inference_image.size


def _resize_mask_to_original(mask_png: bytes, target_size: tuple[int, int]) -> bytes:
    with Image.open(io.BytesIO(mask_png)) as image:
        mask = image.convert("L")
        if mask.size == target_size:
            return mask_png
        restored = mask.resize(target_size, Image.BILINEAR)
    encoded = io.BytesIO()
    restored.save(encoded, format="PNG")
    return encoded.getvalue()


def _normalize_upload(file: UploadFile | None, image: UploadFile | None) -> UploadFile:
    picked = image or file
    if picked is None:
        raise HTTPException(status_code=400, detail="missing_image")
    return picked


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "defaultModel": DEFAULT_MODEL,
        "supportedModels": sorted(SUPPORTED_MODELS),
        "maxCachedSessions": MAX_CACHED_SESSIONS,
        "maxInputSide": MAX_INPUT_SIDE,
    }


@app.post("/mask")
async def mask(
    file: UploadFile | None = File(default=None),
    image: UploadFile | None = File(default=None),
    traceId: str | None = Form(default=None),
    model: str = Query(default=DEFAULT_MODEL),
) -> Response:
    upload = _normalize_upload(file, image)
    selected_model = _normalize_model(model)
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="missing_image")

    prepared, original_size, inference_size = _prepare_image_for_inference(raw)

    try:
        out = _load_png_bytes(prepared, selected_model)
    except Exception:  # noqa: BLE001
        if selected_model != DEFAULT_MODEL:
            raise
        out = _load_png_bytes(prepared, FALLBACK_MODEL)
        selected_model = FALLBACK_MODEL
    finally:
        if MAX_CACHED_SESSIONS == 0:
            SESSIONS.clear()
        gc.collect()

    if inference_size != original_size:
        out = _resize_mask_to_original(out, original_size)

    headers = {
        "Cache-Control": "no-store",
        "X-Mask-Provider": "rembg",
        "X-Mask-Model": selected_model,
    }
    if traceId:
        headers["X-Trace-Id"] = traceId

    return Response(content=out, media_type="image/png", headers=headers)
