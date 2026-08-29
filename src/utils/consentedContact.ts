import { getConsentedUserData } from '@apps-in-toss/native-modules';
import { CONSENTED_USER_DATA_KEY } from '../config';

/**
 * The delivery details, asked for once instead of typed nine times.
 *
 * The order screen used to collect 이름, 연락처, 이메일 and four address fields
 * by hand. Toss already holds all of them, and getConsentedUserData will hand
 * them over after the customer agrees on a Toss-owned consent sheet — so the
 * form becomes the fallback rather than the way in.
 *
 * Every path that is not `provided` has to land on that fallback, but they are
 * not the same failure and should not read the same to us: `unsupported` is an
 * old Toss app, `declined` is the customer's choice, and `unconfigured` is our
 * console missing a consent document — a bug on our side that would otherwise
 * look like a customer who said no.
 */

export type ConsentedContact = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type ConsentedContactResult =
  | { status: 'provided'; contact: ConsentedContact }
  | { status: 'declined'; code: string }
  | { status: 'unsupported' }
  | { status: 'unconfigured'; code: string }
  | { status: 'failed'; code: string };

/** Codes that mean the customer said no, rather than that we are broken. */
const DECLINED_CODES = ['USER_DECLINED', 'CANCELED'];
/** Codes that mean the mini app is missing console setup. */
const UNCONFIGURED_CODES = ['TERMS_NOT_SET', 'INVALID_REQUEST'];

function errorCodeOf(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'UNKNOWN';
}

/** Blank strings come back for fields the customer has not filled in on Toss. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function toContact(
  data: Partial<Record<string, string>> | undefined,
): ConsentedContact {
  return {
    name: clean(data?.USER_NAME),
    phone: clean(data?.USER_PHONE),
    email: clean(data?.USER_EMAIL),
    address: clean(data?.USER_ADDRESS),
  };
}

/** True when there is enough here to ship a parcel without asking again. */
export function isShippable(contact: ConsentedContact): boolean {
  return Boolean(contact.name && contact.phone && contact.address);
}

export async function requestConsentedContact({
  retryAfterDecline = false,
}: { retryAfterDecline?: boolean } = {}): Promise<ConsentedContactResult> {
  /**
   * The symbol is missing on old runtimes rather than throwing a nice error,
   * and six SDK calls in this app were once undefined at runtime while
   * TypeScript was perfectly happy. Check before calling.
   */
  if (typeof getConsentedUserData !== 'function') {
    return { status: 'unsupported' };
  }

  try {
    const data = await getConsentedUserData({
      consentedUserDataKey: CONSENTED_USER_DATA_KEY,
      shouldRequestAgreementWhenUserDeclined: retryAfterDecline,
    });
    // Toss apps below 5.264.0 resolve with undefined instead of failing.
    if (!data) return { status: 'unsupported' };

    const contact = toContact(data);
    if (!isShippable(contact)) {
      return { status: 'failed', code: 'CONSENTED_USER_DATA_INCOMPLETE' };
    }
    return { status: 'provided', contact };
  } catch (error) {
    const code = errorCodeOf(error);
    if (DECLINED_CODES.includes(code)) return { status: 'declined', code };
    if (UNCONFIGURED_CODES.includes(code)) return { status: 'unconfigured', code };
    return { status: 'failed', code };
  }
}
