import { normalizeAppsInTossRuntime } from './ensureAppsInTossRuntime';

describe('normalizeAppsInTossRuntime', () => {
  it('fills missing runtime constants with safe defaults', () => {
    const runtime = {};

    normalizeAppsInTossRuntime(runtime);

    expect(runtime).toMatchObject({
      operationalEnvironment: 'sandbox',
      tossAppVersion: '0.0.0',
    });
  });

  it('keeps existing valid runtime constants unchanged', () => {
    const runtime = {
      operationalEnvironment: 'toss',
      tossAppVersion: '5.300.0',
    };

    normalizeAppsInTossRuntime(runtime);

    expect(runtime).toEqual({
      operationalEnvironment: 'toss',
      tossAppVersion: '5.300.0',
    });
  });

  it('does not throw on non-configurable properties', () => {
    const runtime = {} as {
      operationalEnvironment?: string;
      tossAppVersion?: string;
    };

    Object.defineProperty(runtime, 'operationalEnvironment', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: undefined,
    });

    expect(() => normalizeAppsInTossRuntime(runtime)).not.toThrow();
    expect(runtime.tossAppVersion).toBe('0.0.0');
    expect(runtime.operationalEnvironment).toBeUndefined();
  });
});
