/**
 * Object storage on Vercel Blob.
 *
 * Replaces GCS so the server carries no GCP dependency and can run on a
 * serverless host.
 *
 * Access is chosen by what the object contains, not by convenience:
 *   - Design artwork is public. The app renders it directly, and a private
 *     object would mean proxying every image through a function.
 *   - Order PDFs are private. They carry the customer's name, phone and
 *     address, so they must not sit behind a permanent public URL.
 */

const { put, del } = require('@vercel/blob');

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Store a buffer and return its blob URL.
 *
 * `addRandomSuffix: false` keeps the key we computed, so callers can still
 * reason about paths (`uploads/...`, `orders/...`).
 *
 * The URL of a private blob is not publicly fetchable — it is an identifier for
 * a later server-side read, never something to hand to a client or paste into
 * an email.
 */
async function uploadToBlob({ key, body, contentType, access = 'public' }) {
  if (!isBlobConfigured()) {
    throw new Error('Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN.');
  }
  if (!key) {
    throw new Error('Blob key is required.');
  }

  const result = await put(key, body, {
    access,
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return { url: result.url, pathname: result.pathname, access };
}

async function deleteFromBlob(urlOrPathname) {
  if (!isBlobConfigured()) return;
  await del(urlOrPathname);
}

module.exports = {
  isBlobConfigured,
  uploadToBlob,
  deleteFromBlob,
};
