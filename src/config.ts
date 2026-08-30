export const API_BASE_URL = 'https://merchandisegpt-api.vercel.app';

/**
 * Names the consent document and the data bundle Toss hands back.
 *
 * Issued in the Apps in Toss console together with the 사용자 데이터 제공 동의문.
 * Until that document exists, getConsentedUserData throws TERMS_NOT_SET and the
 * order screen falls back to its own form.
 */
export const CONSENTED_USER_DATA_KEY = 'cud_delivery';
