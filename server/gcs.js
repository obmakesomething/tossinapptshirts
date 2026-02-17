const { Storage } = require('@google-cloud/storage');

let storageClient;
function getStorageClient() {
  if (storageClient) return storageClient;
  // Uses ADC on Cloud Run (service account). For local, `gcloud auth application-default login`
  // or GOOGLE_APPLICATION_CREDENTIALS can be used.
  storageClient = new Storage();
  return storageClient;
}

function isGcsConfigured() {
  return Boolean(process.env.GCS_UPLOAD_BUCKET || process.env.GCS_ORDER_BUCKET);
}

async function uploadToGcs({ bucketName, key, body, contentType }) {
  if (!bucketName) {
    throw new Error('GCS bucketName is required.');
  }
  const bucket = getStorageClient().bucket(bucketName);
  const file = bucket.file(key);

  // `save` is the simplest path for small-ish buffers (images/PDF). For very large
  // assets we can switch to createWriteStream/resumable uploads later.
  await file.save(body, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'private, max-age=0, no-transform',
    },
  });

  return { bucket: bucketName, key };
}

async function getSignedReadUrl({ bucketName, key, ttlSeconds }) {
  if (!bucketName) throw new Error('GCS bucketName is required.');
  const bucket = getStorageClient().bucket(bucketName);
  const file = bucket.file(key);
  const expiresMs = Date.now() + Number(ttlSeconds || 3600) * 1000;
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresMs,
  });
  return url;
}

module.exports = {
  isGcsConfigured,
  uploadToGcs,
  getSignedReadUrl,
};

