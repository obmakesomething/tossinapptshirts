# Toss Miniapp Mockup Studio (MVP)

## Scope
- App-in-App inside Toss (React Native + Granite + TDS).
- Generate product mockups only (no ordering, no fulfillment).
- Image inputs: upload or Imagen generation.
- Background removal via Google Cloud Run service.
- Mockups generated via template compositing (server-side).
- Product catalog sourced from Customzone CSV, filtered to core SKUs.

## Non-goals
- No Toss Login / Toss Pay / push / promotion APIs (mTLS not required).
- No checkout or order management.
- No 3D rendering in MVP.

## User journey
1. Home -> choose Upload or Generate.
2. Input image -> optional background removal -> pick result.
3. Select product options (color/size) -> place design on print area.
4. Preview mockups -> save/share.

## Screens
### Home
- Primary CTA: Upload image
- Secondary CTA: Generate image (Imagen)
- Recent designs (optional)

### Upload
- File picker
- Crop (square/portrait)
- Background removal toggle + before/after preview

### Generate (Imagen)
- Prompt input (English)
- Style chips (minimal / line-art / graphic)
- Aspect ratio selector
- Results grid (1-4) + select one

### Product & Edit
- Product: catalog selection (티셔츠 / 후드 / 맨투맨 / 에코백)
- Color swatches (from CSV)
- Size selector (from CSV)
- Print size selector with pricing tiers
- Print area overlay
- Transform: scale/rotate/drag
- Quality warnings (low-res)
- Detail: show printing model name per SKU

### Mockup Preview
- Carousel (front/back, 2-3 shots)
- Color switch
- Save / Share

### My Designs (optional)
- List of saved designs
- Re-edit / delete

## Image pipeline
- Upload: accept JPG/PNG, max size + dimension checks.
- Generate: call Imagen on server -> store result -> return URLs.
- Background removal: send to Cloud Run -> PNG output -> store.
- Design asset output: transparent PNG.
- Print area baseline: 3600x4800 px (12x16 in @300 DPI).

## Mockup pipeline (Template)
- Maintain template images (front/back) from `data/downloads`.
- Each template has a print area (x, y, width, height in %).
- Composite: template + design layer (PNG) in print area.
- Output: front/back flat mockups per color.
- Cache key: hash(templateId + designUrl + placement + transform).
- Store result URLs for reuse.

## API (internal)
- POST /v1/images/upload
- POST /v1/images/generate
- POST /v1/images/{id}/remove-bg
- GET /v1/templates
- POST /v1/mockups (template composite)
- GET /v1/designs (optional)

## Data model (conceptual)
- Image: id, source (upload|imagen), width, height, url, createdAt
- Design: id, imageId, transform, productColor, size, createdAt
- Mockup: id, designId, templateId, urls[], createdAt

## Validation & errors
- Reject images > MAX_UPLOAD_MB or > MAX_IMAGE_PX.
- Warn if design px < print area baseline.
- Timeouts: background removal, Imagen.
- Graceful fallback on generate/remove-bg failures.

## Accessibility
- 44px touch targets minimum.
- Text labels for color swatches.
- Announce loading and error states.
- High contrast for critical actions.

## Config (env)
- See .env.example for required variables (Imagen + bg removal).

## Data source
- `data/customzone_products.csv` is the source of products, colors, sizes, and prices.
- `scripts/build_catalog.py` filters to core SKUs and forces colors to white/black.
- `data/downloads/**` contains local product images for dev only.
- Run `python scripts/build_catalog.py` after CSV changes.

## Pricing (print-only)
- Logo (<10cm): ₩2,500
- A5 (10~15cm): ₩5,500
- A4 (15~28cm): ₩7,500
- A3 (최대): ₩9,500
- Product price separate (from Customzone catalog).
