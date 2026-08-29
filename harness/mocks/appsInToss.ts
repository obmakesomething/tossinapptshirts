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

/** The sandbox stands in as an integrated service so login can be walked through. */
export const getIsTossLoginIntegratedService = async () => true;

export const TossPay = {
  requestPayment: async () => ({ success: false, reason: 'harness' }),
};

/**
 * There is no album in a browser, so the picker hands back a fixed sample
 * design. Without it the editor can only ever be reviewed in its empty state,
 * and the state that matters — artwork on the garment — is unreachable.
 */
const SAMPLE_DESIGN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <circle cx="300" cy="300" r="230" fill="#1B64DA"/>
  <circle cx="300" cy="300" r="150" fill="#FFFFFF"/>
  <circle cx="300" cy="300" r="70" fill="#F04452"/>
</svg>`;

const SAMPLE_DESIGN_DATA_URI = `data:image/svg+xml;base64,${btoa(SAMPLE_DESIGN_SVG)}`;

export const fetchAlbumPhotos = Object.assign(
  async () => [{ id: 'harness-sample', dataUri: SAMPLE_DESIGN_DATA_URI }],
  {
    getPermission: async () => 'allowed' as const,
    openPermissionDialog: async () => 'allowed' as const,
  },
);

/**
 * Stands in for Toss's consent sheet.
 *
 * `?consent=decline` on the harness URL exercises the fallback form, and
 * `?consent=old` the pre-5.264.0 Toss app that resolves with undefined —
 * both of which the order screen has to handle without losing the customer.
 */
export const getConsentedUserData = async () => {
  const mode = new URLSearchParams(window.location.search).get('consent');
  if (mode === 'decline') throw { code: 'USER_DECLINED' };
  if (mode === 'unconfigured') throw { code: 'TERMS_NOT_SET' };
  if (mode === 'old') return undefined;
  return {
    USER_NAME: '이대영',
    USER_PHONE: '010-1234-5678',
    USER_EMAIL: 'daepop98@gmail.com',
    USER_ADDRESS: '서울특별시 강남구 테헤란로 1',
  };
};
