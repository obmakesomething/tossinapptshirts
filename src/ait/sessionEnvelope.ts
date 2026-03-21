export type AitSessionUser = {
  id: string;
  role?: string | null;
  alias?: string | null;
};

export type AitSessionIdentity = {
  provider: 'toss';
  userKey?: string | null;
  referrer?: string | null;
  scope?: unknown;
};

export type AitSessionEnvelope = {
  sessionToken: string;
  user: AitSessionUser | null;
  identity: AitSessionIdentity | null;
  mode: 'stub' | 'live';
};

const toNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
};

export const normalizeAitSessionEnvelope = (input: Record<string, unknown>): AitSessionEnvelope => {
  const sessionToken = toNullableString(input.sessionToken);
  if (!sessionToken) {
    throw new Error('sessionToken is required.');
  }

  const userInput = input.user as Record<string, unknown> | null | undefined;
  const identityInput = input.identity as Record<string, unknown> | null | undefined;
  const fallbackUserKey = toNullableString(input.userKey);

  const user =
    userInput || fallbackUserKey
      ? {
          id: toNullableString(userInput?.id ?? fallbackUserKey) ?? sessionToken,
          role: toNullableString(userInput?.role),
          alias: toNullableString(userInput?.alias),
        }
      : null;

  const userKey = toNullableString(identityInput?.userKey ?? fallbackUserKey);
  const referrer = toNullableString(identityInput?.referrer ?? input.referrer);
  const scope = identityInput?.scope ?? input.scope ?? null;
  const identity =
    userKey || referrer || scope != null
      ? {
          provider: 'toss' as const,
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
};
