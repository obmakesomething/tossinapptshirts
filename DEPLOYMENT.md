# Deployment Guide (Vercel)

## Current Production Target
- Backend runtime: **Vercel Functions** (Fluid Compute, Node.js 24)
- Project: `oblees-projects/merchandisegpt-api`
- Base URL: `https://merchandisegpt-api.vercel.app`

The server has no GCP dependency. Cloud Run, Cloud SQL, GCS, and Vertex AI were
all removed; `Dockerfile`, `.gcloudignore`, and `cloudbuild.yaml` remain only for
history and are excluded from the deployment by `.vercelignore`.

## How it is wired

| Piece | Where |
|---|---|
| API | `api/index.js` re-exports the Express app from `server/index.js` |
| Routing | `vercel.json` rewrites everything to `/api`; `public/` is served statically |
| Mockups | `public/mockups/*`, served by the static host, never waking a function |
| Fonts | `assets/fonts/**`, declared via `functions.includeFiles` because the PDF builder reads them through `path.join` at runtime |
| Build | none — `npm run build` in this repo is the React Native `ait build` and must not run here |

`server/index.js` exports the app and only calls `app.listen` when run directly
(`require.main === module`), so the same file works locally and on Vercel.

## Required Environment Variables

Set on the Vercel project (Production):

```bash
# Database — Supabase Postgres, transaction pooler (port 6543)
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
PG_POOL_MAX=5            # the pooler caps connections; keep this low
PG_IDLE_TIMEOUT_MS=10000
PG_CONNECT_TIMEOUT_MS=10000

# Object storage — provisioned automatically when a Blob store is linked
BLOB_READ_WRITE_TOKEN=
BLOB_IMAGE_PREFIX=uploads

# Image generation
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_QUALITY=medium

# Mail
ORDER_EMAIL_TO=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Toss payment (mTLS client certificate, base64 of the PEM files)
MTLS_KEY_BASE64=
MTLS_CERT_BASE64=

# Toss withdrawal callback — required, the endpoint fails closed without them
TOSS_CALLBACK_USERNAME=
TOSS_CALLBACK_PASSWORD=

# Optional: shared rate limit counters. Without these the limiter counts per
# instance, so the effective limit becomes max x warm instances.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`DATABASE_URL` gotchas, both of which cost real debugging time:
- It is **not** a Supabase API key (`sb_publishable_...` / `sb_secret_...`). Those
  are for `@supabase/supabase-js`; this server talks to Postgres directly.
- Percent-encode any `@ : / ? #` in the password, or the URL parser takes the
  wrong `@` as the delimiter and the host resolves to nonsense.

## Deploy

```bash
vercel deploy --prod --yes
```

Environment variable changes only take effect on the next deploy.

## Verification

`GET /health` reports every dependency:

```json
{
  "ok": true,
  "services": {
    "blob": true,
    "pdfFonts": true,
    "openai": true,
    "smtp": true,
    "db": true,
    "databaseConfigured": true
  }
}
```

When the database check fails it also returns `dbTarget` — the host, port and
database parsed from `DATABASE_URL`, with no credentials — which is the fastest
way to spot a malformed connection string.

Further checks:
- `GET /mockups/hero_design.png` → 200 (static host)
- `GET /v1/orders` without `x-toss-user-key` → 401; with one → 200
- `GET /v1/orders/<id>` for another user's order → 404, never 403, so the route
  cannot be probed
- `POST /v1/toss/disconnect` without `TOSS_CALLBACK_*` configured → 503

## Apps in Toss

After deploying, `src/config.ts` must point at the same base URL, then rebuild:

```bash
npx ait build
```

Console callback settings (유저정보 불러오기 → 콜백 정보):
- Callback URL: `https://merchandisegpt-api.vercel.app/v1/toss/disconnect`
- Method: `POST`
- Basic Auth header: base64 of `TOSS_CALLBACK_USERNAME:TOSS_CALLBACK_PASSWORD`
