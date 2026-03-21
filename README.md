# merchandisegpt

Toss miniapp for apparel mockups + order request.

## Setup
- Update `src/config.ts` with your API server base URL (Cloud Run).
- Configure env vars from `.env.example` on Cloud Run (Secret Manager recommended).
- Fonts are bundled from `assets/fonts` (Noto Sans KR).

## Build
```
npm install
npm run build
```

## iOS Simulator (Apps-in-Toss Sandbox)
- Runbook: `docs/IOS_SIMULATOR_SANDBOX_RUNBOOK.md`
- Doctor only:
```bash
SANDBOX_BUNDLE_ID="<official_bundle_id>" npm run ios:ait:doctor
```
- Full launch helper:
```bash
SANDBOX_BUNDLE_ID="<official_bundle_id>" npm run ios:ait:run
```

## Production Deployment

### GCP Cloud Run (Primary)
1. Build/deploy the server container using `Dockerfile`.
2. Set environment variables from `.env.example` (use Secret Manager for secrets).
3. Use Cloud SQL (`DATABASE_URL`) and GCS (`GCS_UPLOAD_BUCKET`, `GCS_ORDER_BUCKET`) in production.

### Quick Deploy
```bash
gcloud run deploy merchandisegpt-api \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated
```

### Traffic Scaling
The server includes production-ready features:
- **Rate Limiting**: Prevents abuse (100 req/15min globally, 20 req/15min for heavy operations)
- **Security Headers**: XSS and clickjacking protection via Helmet
- **Compression**: Gzip/Deflate for reduced bandwidth
- **Request Timeout**: 2-minute timeout to prevent resource exhaustion
- **Clustering**: Multi-process support for better CPU utilization
- **Enhanced Health Check**: `/health` endpoint with detailed metrics

See [docs/TRAFFIC_SCALING.md](docs/TRAFFIC_SCALING.md) for detailed scaling strategies.

## Features

### Order Management
- **Automated Email System**: Sends detailed order PDFs to manufacturers with embedded images and print-ready files
- **Print Pipeline**: Automatic image upscaling for high-quality printing (A4 300 DPI)
- **S3 Storage**: Optional cloud storage for order PDFs and images

See [docs/ORDER_EMAIL_SYSTEM.md](docs/ORDER_EMAIL_SYSTEM.md) for order fulfillment details.

### Print Size Calculator
- **Smart Sizing**: Calculate exact print dimensions based on garment size
- **Size Database**: Complete measurements for T-shirts, hoodies, sweatshirts, and eco bags
- **API Endpoints**:
  - `POST /v1/print/calculate-size` - Calculate print dimensions
  - `GET /v1/print/sizes` - Get size information
- **Client Utilities**: TypeScript utilities for local calculations

See [docs/PRINT_SIZE_CALCULATOR.md](docs/PRINT_SIZE_CALCULATOR.md) for complete API documentation.
