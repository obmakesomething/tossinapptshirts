# merchandisegpt

Toss miniapp for apparel mockups + order request.

## Setup
- Update `src/config.ts` with your Railway base URL.
- Configure env vars from `.env.example` on Railway.
- Fonts are bundled from `assets/fonts` (Noto Sans KR).

## Build
```
npm install
npm run build
```

## Production Deployment

### Railway Configuration
1. Set environment variables from `.env.example`
2. The `nixpacks.toml` file is pre-configured for optimal Railway deployment
3. For cluster mode (recommended for production):
   - Set Start Command to: `npm run start:cluster`
   - Adjust `WEB_CONCURRENCY` env var based on your Railway plan

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
