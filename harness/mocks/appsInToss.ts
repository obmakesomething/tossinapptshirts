/**
 * Stand-in for @apps-in-toss/framework and /native-modules.
 *
 * Everything here is inert: the harness exists to look at screens, so native
 * calls resolve with benign values instead of reaching a host that is not there.
 */

const memory = new Map<string, string>();

export const Storage = {
  getItem: async (key: string) => memory.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: async (key: string) => {
    memory.delete(key);
  },
};

export const eventLog = async () => undefined;
export const share = async () => undefined;
export const getTossShareLink = async (scheme: string) => scheme;
export const appLogin = async () => ({
  authorizationCode: 'harness-code',
  referrer: 'harness',
});

export const TossPay = {
  requestPayment: async () => ({ success: false, reason: 'harness' }),
};

/** Album access is unavailable in a browser; screens handle the empty result. */
export const fetchAlbumPhotos = Object.assign(
  async () => [] as { id?: string; dataUri?: string }[],
  {
    getPermission: async () => 'denied' as const,
    openPermissionDialog: async () => 'denied' as const,
  },
);
