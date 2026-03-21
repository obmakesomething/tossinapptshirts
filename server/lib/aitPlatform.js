function toNullableString(value) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

function createAitSessionEnvelope(input) {
  const sessionToken = toNullableString(input.sessionToken);
  if (!sessionToken) {
    throw new Error('sessionToken is required.');
  }

  const user = input.user
    ? {
        id: String(input.user.id),
        role: toNullableString(input.user.role),
        alias: toNullableString(input.user.alias),
      }
    : null;

  const userKey = toNullableString(input.identity?.userKey);
  const referrer = toNullableString(input.identity?.referrer);
  const scope = input.identity?.scope ?? null;
  const identity =
    userKey || referrer || scope != null
      ? {
          provider: 'toss',
          userKey,
          referrer,
          scope,
        }
      : null;

  return {
    sessionToken,
    user,
    identity,
    mode: input.mode === 'stub' ? 'stub' : 'live',
  };
}

function decodeBasicAuth(header) {
  const raw = toNullableString(header);
  if (!raw) return null;
  const [scheme, token] = raw.split(/\s+/, 2);
  if (!token || scheme.toLowerCase() !== 'basic') return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function createDisconnectAuthVerifier({ username, password }) {
  const expectedUser = toNullableString(username);
  const expectedPassword = toNullableString(password);

  return function verifyDisconnectAuthorization(header) {
    if (!expectedUser || !expectedPassword) {
      return { ok: true, reason: 'skipped' };
    }

    const parsed = decodeBasicAuth(header);
    const ok = Boolean(parsed && parsed.username === expectedUser && parsed.password === expectedPassword);
    return { ok, reason: ok ? 'matched' : 'invalid' };
  };
}

module.exports = {
  createAitSessionEnvelope,
  createDisconnectAuthVerifier,
};
