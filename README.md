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
