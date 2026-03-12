const DEFAULT_MODEL = 'birefnet-general-lite';
const LIGHT_MODEL = 'birefnet-general-lite';
const BRIA_MODEL = 'bria-rmbg';
const MASK_ENDPOINT_PATH = '/mask';
const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_TIMEOUT_MS = 600_000;

const SUPPORTED_MODELS = new Set([
  DEFAULT_MODEL,
  LIGHT_MODEL,
  BRIA_MODEL,
]);
const MODEL_ALIASES = {
  'birefnet-lite': LIGHT_MODEL,
  bria: BRIA_MODEL,
};

function makeError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizeModel(model) {
  const raw = String(model || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const normalized = MODEL_ALIASES[raw] || raw;
  if (SUPPORTED_MODELS.has(normalized)) {
    return normalized;
  }
  return DEFAULT_MODEL;
}

function resolveMaskServiceBaseUrl(env) {
  const raw =
    typeof env?.REMBG_MASK_BASE_URL === 'string'
      ? env.REMBG_MASK_BASE_URL.trim()
      : '';
  return raw || null;
}

function resolveTimeoutMs(env) {
  const raw = Number(env?.REMBG_MASK_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 1_000 && raw <= MAX_TIMEOUT_MS) {
    return Math.round(raw);
  }
  return DEFAULT_TIMEOUT_MS;
}

function hasMaskProviderEnv(env) {
  return Boolean(resolveMaskServiceBaseUrl(env));
}

async function safeReadText(response, limit = 1_400) {
  try {
    const text = await response.text();
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  } catch {
    return '';
  }
}

async function requestMaskOnce({ imageBytes, mimeType, model, env, traceId }) {
  const baseUrl = resolveMaskServiceBaseUrl(env);
  if (!baseUrl) {
    throw makeError(
      'mask_provider_unconfigured',
      'Mask provider is not configured. Set REMBG_MASK_BASE_URL.',
      { status: 501 },
    );
  }

  const timeoutMs = resolveTimeoutMs(env);
  const endpoint = new URL(MASK_ENDPOINT_PATH, baseUrl);
  endpoint.searchParams.set('model', model);

  const body = new FormData();
  if (traceId) {
    body.append('traceId', String(traceId));
  }
  body.append(
    'image',
    new Blob([imageBytes], {
      type: mimeType || 'application/octet-stream',
    }),
    'upload',
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await safeReadText(response);
      throw makeError(
        'mask_provider_error',
        `rembg mask provider failed (${response.status})`,
        {
          status: 502,
          providerStatus: response.status,
          detail,
        },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw makeError(
        'mask_provider_timeout',
        `rembg mask provider timed out (${timeoutMs}ms)`,
        { status: 504 },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateMaskWithRembg({
  imageBytes,
  mimeType,
  model,
  env,
  traceId,
}) {
  const selectedModel = normalizeModel(model);
  const triedModels = [selectedModel];
  const pngBytes = await requestMaskOnce({
    imageBytes,
    mimeType,
    model: selectedModel,
    env,
    traceId,
  });
  return {
    provider: 'rembg',
    model: selectedModel,
    triedModels,
    pngBytes,
  };
}

module.exports = {
  DEFAULT_MODEL,
  generateMaskWithRembg,
  hasMaskProviderEnv,
};
