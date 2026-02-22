# GCP Full Migration (Cloud Run + Cloud SQL + GCS) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the Railway-hosted backend (Node/Express API), storage (S3-compatible Railway Storage), and PostgreSQL DB to GCP (Cloud Run + Cloud Storage + Cloud SQL) with a safe cutover and rollback path.

**Architecture:** One public Cloud Run service for the API. Private GCS buckets for uploads/PDFs (served via signed URLs). Cloud SQL (PostgreSQL) for inquiries. Secrets stored in Secret Manager. Deployment via Cloud Build to Artifact Registry, then Cloud Run.

**Tech Stack:** Node.js 22, Express 5, `pg`, `@google-cloud/storage`, Cloud Run, Cloud SQL (Postgres), Cloud Storage (GCS), Secret Manager, Cloud Build, Artifact Registry, Vertex AI (Imagen edit), OpenAI, SMTP.

---

## Scope / Non-goals

**In scope**
- API: all endpoints in `server/index.js` including uploads, remove-bg (Vertex/Clipdrop), PDF generation, inquiry DB, payment (mTLS).
- DB: migrate existing Railway Postgres data (`inquiries`, `inquiry_replies`) to Cloud SQL.
- Storage: migrate uploads/PDF writes from S3 to GCS (signed URL or proxy).
- Miniapp config: update `API_BASE_URL` + mockup base so the app points to the new backend.
- Deployment/ops: logs/monitoring, secrets, rollback.

**Out of scope (for this plan)**
- UI redesign work in the miniapp (we only repoint endpoints and verify flows).
- Replacing payment provider logic (we keep current TossPay integration).
- Full job persistence for `/api/generations` (currently in-memory; can be a later milestone).

---

## Key Current-State Facts (from repo)

- Backend entry: `server/index.js` (Express).
- DB client: `server/db.js` uses `pg` and `DATABASE_URL`.
- Storage: S3-compatible via `@aws-sdk/client-s3`, env vars `S3_*`, and `uploadToS3()` in `server/index.js`.
- Mockups are served from filesystem via `express.static('server-public/mockups')` at `/mockups`.
- Payment endpoints require **mTLS** (`MTLS_KEY_BASE64`, `MTLS_CERT_BASE64`) and hit `pay-apps-in-toss-api.toss.im`.
- Vertex remove-bg path is already implemented (`REMOVE_BG_PROVIDER=vertex_imagen`).
- Miniapp hardcodes API base URL: `src/config.ts`.
- Mockup base URL is hardcoded to Railway: `src/config/mockups.ts`.

---

## Decisions To Confirm (before implementing)

1) **Target GCP project**
   - Use an existing project or create a new one dedicated to prod?

2) **Region**
   - Default suggestion: use **one region** for Cloud Run + Cloud SQL + buckets (example: `asia-northeast3`).
   - But Vertex Imagen model availability might constrain region. If Imagen edit is only available in `us-central1`, we may need:
     - (A) keep everything in `us-central1`, or
     - (B) keep API/DB in KR region and call Vertex cross-region (latency/egress).

3) **How the miniapp accesses uploaded images**
   - **Option A (recommended): signed URLs** (private bucket, time-limited read URLs).
   - Option B: public bucket (not recommended due to user photos).
   - Option C: Cloud Run proxy endpoint `/v1/files/:key` (private bucket; API streams content).

This plan assumes **Option A (signed URLs)**.

---

## Phase 0: Inventory + Freeze Railway (No code changes)

### Task 0: Snapshot current Railway runtime config

**Files:** none

**Step 1:** In Railway dashboard, export/copy all runtime env vars (do not commit).
Expected: you have values for `DATABASE_URL`, `OPENAI_API_KEY`, SMTP vars, `REMOVE_BG_PROVIDER`, Vertex vars, S3 vars, mTLS vars.

**Step 2:** Record current endpoints that must work after cutover:
- `GET /health`
- `GET /mockups/*`
- `POST /v1/images/upload`
- `POST /v1/images/remove-background`
- `POST /v1/payment/create`
- `POST /v1/payment/execute`
- `POST /v1/inquiries` and `GET /v1/inquiries` (if used)

**Step 3:** Export DB snapshot (Railway Postgres)
Run locally:
```bash
pg_dump "$RAILWAY_DATABASE_URL" > railway_dump.sql
```
Expected: `railway_dump.sql` created (keep it out of git).

---

## Phase 1: GCP Project Bootstrap (Infra first)

### Task 1: Set GCP project + enable required APIs

**Files:** none

**Step 1:** Set variables
```bash
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-northeast3"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"
```

**Step 2:** Enable APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  aiplatform.googleapis.com \
  iamcredentials.googleapis.com
```
Expected: success for each API (no permission errors).

### Task 2: Artifact Registry repo for Docker images

**Files:** none

**Step 1:**
```bash
gcloud artifacts repositories create merch-api \
  --repository-format=docker \
  --location="$REGION" \
  --description="MerchandiseGPT API images"
```
Expected: repo exists.

### Task 3: Service account + IAM roles (Cloud Run runtime)

**Files:** none

**Step 1:** Create runtime SA
```bash
gcloud iam service-accounts create merch-api-runtime \
  --display-name="Merch API runtime"
```

**Step 2:** Grant roles (least-priv later; start practical)
```bash
RUNTIME_SA="merch-api-runtime@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="roles/aiplatform.user"
```
Expected: bindings added.

---

## Phase 2: Cloud SQL (PostgreSQL) Setup + Data Migration

### Task 4: Create Cloud SQL Postgres instance

**Files:** none

**Step 1:** Create instance (example settings; adjust size later)
```bash
gcloud sql instances create merch-db \
  --database-version=POSTGRES_15 \
  --region="$REGION" \
  --cpu=1 --memory=4GB \
  --storage-type=SSD --storage-size=20GB
```

**Step 2:** Create DB + user
```bash
gcloud sql databases create merch --instance=merch-db
gcloud sql users create merch_app --instance=merch-db --password="SET_STRONG_PASSWORD"
```

### Task 5: Import Railway dump into Cloud SQL

**Files:** none

**Step 1:** Upload dump to a temporary GCS bucket
```bash
gcloud storage buckets create "gs://$PROJECT_ID-sql-import" --location="$REGION"
gcloud storage cp railway_dump.sql "gs://$PROJECT_ID-sql-import/railway_dump.sql"
```

**Step 2:** Import into Cloud SQL
```bash
gcloud sql import sql merch-db "gs://$PROJECT_ID-sql-import/railway_dump.sql" --database=merch
```
Expected: import succeeds.

---

## Phase 3: GCS Buckets (Uploads + PDFs)

### Task 6: Create private buckets

**Files:** none

**Step 1:**
```bash
gcloud storage buckets create "gs://$PROJECT_ID-uploads" --location="$REGION"
gcloud storage buckets create "gs://$PROJECT_ID-orders" --location="$REGION"
```

**Step 2:** Set uniform access (recommended)
```bash
gcloud storage buckets update "gs://$PROJECT_ID-uploads" --uniform-bucket-level-access
gcloud storage buckets update "gs://$PROJECT_ID-orders" --uniform-bucket-level-access
```

---

## Phase 4: Backend Code Changes (S3 -> GCS)

### Task 7: Add GCS uploader module

**Files:**
- Create: `server/gcs.js`
- Modify: `server/index.js`

**Step 1:** Add dependency
Run:
```bash
npm install @google-cloud/storage
```

**Step 2:** Create `server/gcs.js` with `uploadToGcs()` + `getSignedUrl()`
- Use ADC (Cloud Run runtime SA) by default.
- Return a signed URL for reads (configurable TTL).

**Step 3:** Replace `uploadToS3()` callsites in `server/index.js`
- `POST /v1/images/upload`
- remove-background results upload
- crop/style-transfer outputs
- PDF store (`/v1/order/*` and payment flow)

**Step 4:** Update `/health` to report `gcs` instead of `s3`

**Step 5:** Local verification
Run:
```bash
npm test
npm run typecheck
```
Expected: PASS.

---

## Phase 5: Container + Cloud Run Deployment

### Task 8: Add Dockerfile for Cloud Run

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1:** Create Dockerfile (Node 22, production deps only, run `node server/index.js`).

**Step 2:** Build locally
```bash
docker build -t merch-api:local .
```

### Task 9: Secrets in Secret Manager + Cloud Run deploy

**Files:** none (but may add `DEPLOYMENT.md` updates later)

**Step 1:** Create secrets (examples)
```bash
printf '%s' "$OPENAI_API_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=-
printf '%s' "$SMTP_PASS" | gcloud secrets create SMTP_PASS --data-file=-
printf '%s' "$MTLS_KEY_BASE64" | gcloud secrets create MTLS_KEY_BASE64 --data-file=-
printf '%s' "$MTLS_CERT_BASE64" | gcloud secrets create MTLS_CERT_BASE64 --data-file=-
```

**Step 2:** Deploy to Cloud Run (initially public)
```bash
IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/merch-api/merch-api:$(git rev-parse --short HEAD)"
gcloud builds submit --tag "$IMAGE_URI"

gcloud run deploy merch-api \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "merch-api-runtime@$PROJECT_ID.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080,REMOVE_BG_PROVIDER=vertex_imagen,GCS_UPLOAD_BUCKET=$PROJECT_ID-uploads,GCS_ORDER_BUCKET=$PROJECT_ID-orders" \
  --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest,SMTP_PASS=SMTP_PASS:latest,MTLS_KEY_BASE64=MTLS_KEY_BASE64:latest,MTLS_CERT_BASE64=MTLS_CERT_BASE64:latest" \
  --add-cloudsql-instances "$PROJECT_ID:$REGION:merch-db"
```

**Step 3:** Smoke test
```bash
curl -sS "$(gcloud run services describe merch-api --region "$REGION" --format='value(status.url)')/health" | jq .
```
Expected: `ok: true`.

---

## Phase 6: Miniapp Cutover

### Task 10: Update miniapp API base URL + mockups base URL

**Files:**
- Modify: `src/config.ts`
- Modify: `src/config/mockups.ts`

**Step 1:** Point `API_BASE_URL` to the new Cloud Run service URL (or custom domain).

**Step 2:** Make mockups derive from `API_BASE_URL` (so it stays in sync).

**Step 3:** Build `.ait`
```bash
npm run build
```
Expected: `merchandisegpt.ait` updated.

---

## Phase 7: Rollout + Rollback

### Task 11: Staged rollout

**Step 1:** Keep Railway running.
**Step 2:** Test in Apps-in-Toss dev environment against Cloud Run URL.
**Step 3:** If OK, switch prod config + update console callback URLs.

### Task 12: Rollback plan

- If payment/upload breaks, revert `API_BASE_URL` to Railway and rebuild `.ait`.
- Keep Cloud SQL import and GCS data intact; retry after fix.

---

## Final Clean-up

### Task 13: Decommission Railway

- After 1-2 weeks stable, disable Railway service and rotate secrets.

