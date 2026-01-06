# Toss Miniapp Mockup Studio (MVP)

## Scope
- App-in-App inside Toss (React Native + Granite + TDS).
- Mockup + 주문 요청(이메일/PDF)까지 처리, 결제는 제외.
- Image inputs: upload or OpenAI image generation.
- Clipdrop로 업스케일 + 누끼 처리(주문 제출 시 고해상도 단계).
- Mockups generated via template compositing (server-side).
- Product catalog sourced from Customzone CSV, filtered to core SKUs.

## Non-goals
- Toss Login / Toss Pay / push / promotion APIs는 사용하지 않음(사용 시 mTLS 필요).
- 인앱 결제, 재고/배송 자동화는 제외.
- No 3D rendering in MVP.

## User journey
1. Home -> choose Upload or Generate.
2. Input image -> select result -> optional text overlay.
3. Select product options (color/size/quantity) -> place design on print area.
4. Preview mockups -> submit order request.
5. 주문 제출 시 Clipdrop 업스케일 + 누끼 + QC -> PDF 발송.

## Screens
### Home
- Primary CTA: Upload image
- Secondary CTA: Generate image (OpenAI)
- Recent designs (optional)

### Upload
- File picker
- Crop (square/portrait)
- Background removal toggle + before/after preview

### Generate (OpenAI)
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
- Transform: scale/rotate/drag (Noto Sans KR text layer 지원)
- Quality warnings (low-res)
- Detail: show printing model name per SKU

### Mockup Preview
- Carousel (front/back, 2-3 shots)
- Color switch
- Save / Share / Order request

### Order Request
- 주문자/배송지 입력
- 배경 제거, QC 경고 처리 옵션
- PDF 생성 + 이메일 전송

### My Designs (optional)
- List of saved designs
- Re-edit / delete

## Image pipeline
- Upload: accept JPG/PNG, max size + dimension checks.
- Generate: call OpenAI Images -> store result -> return URLs.
- Upscale: Clipdrop async upscaling (target size from print option).
- Background removal: Clipdrop remove-bg (주문 제출 시).
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
- POST /v1/images/generate (OpenAI)
- POST /v1/print-files/process (Clipdrop + QC)
- POST /v1/orders/submit (PDF + email + Kakao)
- Planned: /v1/templates, /v1/mockups

## Data model (conceptual)
- Image: id, source (upload|openai), width, height, url, createdAt
- Design: id, imageId, transform, productColor, size, createdAt
- Mockup: id, designId, templateId, urls[], createdAt

## Validation & errors
- Reject images > MAX_UPLOAD_MB or > MAX_IMAGE_PX.
- Warn if design px < print area baseline.
- Timeouts: Clipdrop async polling, OpenAI generation.
- Graceful fallback on generate/remove-bg failures.

## Accessibility
- 44px touch targets minimum.
- Text labels for color swatches.
- Announce loading and error states.
- High contrast for critical actions.

## Config (env)
- See .env.example for required variables (OpenAI + S3 + Clipdrop + Gmail SMTP).
- `CATALOG_ASSET_BASE_URL` (optional): when running `scripts/build_catalog.py`, overrides catalog image URLs to point to your CDN/S3 base.
- `src/config.ts`에 Railway API Base URL 설정 필요.

## Build & deploy
- `npm run build`로 `.ait` 파일 생성 후 콘솔 업로드.
- 서버는 Railway에서 `npm start`로 실행.

## mTLS reminder (Toss APIs)
- Toss 로그인/결제/푸시/프로모션 API를 붙일 경우 mTLS 인증서 설정이 필수.
- 콘솔에서 mTLS 인증서를 발급하고 서버 간 통신에 적용해야 함.

## Data source
- `data/customzone_products.csv` is the source of products, colors, sizes, and prices.
- `scripts/build_catalog.py` filters to core SKUs (Printstar 148/188/183 + Canvas 35x40) and forces colors to white/black.
- `data/downloads/**` contains local product images for dev only and is gitignored.
- `scripts/optimize_images.py` outputs JPG-only optimized assets to `data/optimized/**` (gitignored).
- Run `python3 scripts/build_catalog.py` after CSV changes or after setting `CATALOG_ASSET_BASE_URL`.

### Image optimization + CDN flow
1. `npm run optimize-images` (writes optimized JPGs to `data/optimized/**`).
2. Upload `data/optimized` to S3/CDN root (keep `downloads/...` paths).
3. `CATALOG_ASSET_BASE_URL=https://your-cdn.example.com python3 scripts/build_catalog.py`.

## Pricing (print-only)
- Logo (<10cm): ₩2,500
- A5 (10~15cm): ₩5,500
- A4 (15~28cm): ₩7,500
- A3 (최대): ₩9,500
- Product price separate (from Customzone catalog).

## Pricing rules
- 7만원 이상 무료배송
- 수수료 20~25% 범위 내에서 반올림(정액 마감)
