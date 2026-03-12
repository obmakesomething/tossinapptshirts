const { generateMaskWithRembg, hasMaskProviderEnv } = require('./rembgMask');

describe('rembgMask', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('detects configured env', () => {
    expect(hasMaskProviderEnv({ REMBG_MASK_BASE_URL: 'https://mask.example.com' })).toBe(true);
    expect(hasMaskProviderEnv({ REMBG_MASK_BASE_URL: '   ' })).toBe(false);
  });

  it('throws 501 when the mask service is not configured', async () => {
    await expect(
      generateMaskWithRembg({
        imageBytes: Buffer.from([1, 2, 3]),
        mimeType: 'image/png',
        env: {},
        traceId: 'req-1',
      }),
    ).rejects.toMatchObject({
      code: 'mask_provider_unconfigured',
      status: 501,
    });
  });

  it('wraps provider failures as a 502 error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'upstream failed',
    });

    await expect(
      generateMaskWithRembg({
        imageBytes: Buffer.from([1, 2, 3]),
        mimeType: 'image/png',
        env: { REMBG_MASK_BASE_URL: 'https://mask.example.com' },
        traceId: 'req-2',
      }),
    ).rejects.toMatchObject({
      code: 'mask_provider_error',
      status: 502,
      providerStatus: 503,
    });
  });

  it('maps aborts to a 504 timeout error', async () => {
    global.fetch = jest.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const pending = generateMaskWithRembg({
      imageBytes: Buffer.from([1, 2, 3]),
      mimeType: 'image/png',
      env: {
        REMBG_MASK_BASE_URL: 'https://mask.example.com',
        REMBG_MASK_TIMEOUT_MS: '1000',
      },
      traceId: 'req-3',
    });

    await expect(pending).rejects.toMatchObject({
      code: 'mask_provider_timeout',
      status: 504,
    });
  });

  it('returns PNG bytes and metadata when the provider succeeds', async () => {
    const pngBytes = Uint8Array.from([137, 80, 78, 71]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'x-mask-model': 'birefnet-general-lite' }),
      arrayBuffer: async () => pngBytes.buffer.slice(0),
    });

    await expect(
      generateMaskWithRembg({
        imageBytes: Buffer.from([1, 2, 3]),
        mimeType: 'image/png',
        env: { REMBG_MASK_BASE_URL: 'https://mask.example.com' },
        traceId: 'req-4',
      }),
    ).resolves.toMatchObject({
      provider: 'rembg',
      model: 'birefnet-general-lite',
      triedModels: ['birefnet-general-lite'],
      pngBytes: Buffer.from(pngBytes),
    });
  });
});
