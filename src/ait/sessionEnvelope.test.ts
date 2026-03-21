import { normalizeAitSessionEnvelope } from './sessionEnvelope';

describe('normalizeAitSessionEnvelope', () => {
  it('keeps canonical Session + Identity payloads', () => {
    expect(
      normalizeAitSessionEnvelope({
        sessionToken: 'token-1',
        user: { id: 'user-1', role: null, alias: null },
        identity: { provider: 'toss', userKey: '900', referrer: 'Sandbox', scope: { agreedTerms: true } },
        mode: 'live',
      }),
    ).toEqual({
      sessionToken: 'token-1',
      user: { id: 'user-1', role: null, alias: null },
      identity: { provider: 'toss', userKey: '900', referrer: 'Sandbox', scope: { agreedTerms: true } },
      mode: 'live',
    });
  });

  it('upgrades legacy userKey-first responses', () => {
    expect(
      normalizeAitSessionEnvelope({
        sessionToken: 'token-2',
        userKey: 700,
        scope: 'payments',
      }),
    ).toEqual({
      sessionToken: 'token-2',
      user: { id: '700', role: null, alias: null },
      identity: { provider: 'toss', userKey: '700', referrer: null, scope: 'payments' },
      mode: 'live',
    });
  });
});
