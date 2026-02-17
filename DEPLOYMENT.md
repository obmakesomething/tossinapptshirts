# Deployment Guide (Cloud Run)

## Current Production Target
- Primary backend runtime: **GCP Cloud Run**
- Service name: `merchandisegpt-api`
- Region: `asia-northeast3`
- Base URL example: `https://merchandisegpt-api-peaq3gmvyq-du.a.run.app`

Legacy Railway files may remain in the repo for history, but production deployment is Cloud Run.

## Required Files
This repository now includes Cloud Run deployment files at root:
- `Dockerfile`
- `.dockerignore`
- `.gcloudignore`
- `cloudbuild.yaml`

## Required Environment Variables
Set these in Cloud Run (Secret Manager recommended for sensitive values):

```bash
# Core
NODE_ENV=production
REQUEST_TIMEOUT_MS=120000
WEB_CONCURRENCY=2

# Database (Cloud SQL recommended)
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE

# Image generation
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_QUALITY=medium

# Background removal
REMOVE_BG_PROVIDER=vertex_imagen
VERTEX_PROJECT_ID=your_project_id
VERTEX_LOCATION=us-central1
VERTEX_API_KEY=...
IMAGEN_EDIT_MODEL=imagen-3.0-capability-001
CLIPDROP_API_KEY=... # optional fallback

# Storage (recommended on GCP)
GCS_UPLOAD_BUCKET=your-upload-bucket
GCS_ORDER_BUCKET=your-order-bucket
SIGNED_URL_TTL_SECONDS=604800

# Mail
ORDER_EMAIL_TO=admin@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Toss mTLS (if using Toss auth/payment APIs)
MTLS_KEY_BASE64=...
MTLS_CERT_BASE64=...

# Toss disconnect callback auth (recommended)
TOSS_CALLBACK_USERNAME=...
TOSS_CALLBACK_PASSWORD=...
```

## Deploy Commands

### Option A: Source deploy (fastest)
```bash
gcloud run deploy merchandisegpt-api \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated
```

### Option B: Docker + Cloud Build
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SERVICE=merchandisegpt-api,_REGION=asia-northeast3
```

## Toss Callback Settings (Apps in Toss Console)
- Callback URL: `https://<your-cloud-run-domain>/v1/toss/disconnect`
- Method: `POST` (GET is also supported)
- Basic Auth header: set using `TOSS_CALLBACK_USERNAME/PASSWORD`

If callback test shows `Failed to fetch`, check:
1. Callback URL is Cloud Run URL (not Railway URL).
2. Method is `POST`.
3. Basic Auth credentials match Cloud Run env values.
4. Cloud Run logs show `POST /v1/toss/disconnect` with non-401 status.

## Verification Checklist
- `GET /health` returns `200`.
- `POST /v1/images/generate` works with configured model keys.
- `POST /v1/images/remove-background` works with provider settings.
- `POST /v1/toss/disconnect` returns `200` when Basic Auth is correct.

