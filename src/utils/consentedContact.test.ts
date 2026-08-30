import {
  isShippable,
  requestConsentedContact,
  toContact,
} from './consentedContact';
import { getConsentedUserData } from '@apps-in-toss/native-modules';

jest.mock('@apps-in-toss/native-modules', () => ({
  getConsentedUserData: jest.fn(),
}));

const mocked = getConsentedUserData as unknown as jest.Mock;

beforeEach(() => mocked.mockReset());

/**
 * Every outcome that is not `provided` ends at the same place — the form the
 * customer fills in themselves. These pin that the reasons stay distinct
 * anyway, because a missing consent document in our console must not be
 * reported as a customer who declined.
 */
describe('asking Toss for the delivery details', () => {
  it('returns what the customer agreed to share', async () => {
    mocked.mockResolvedValue({
      USER_NAME: '이대영',
      USER_PHONE: '01012345678',
      USER_EMAIL: 'a@b.com',
      USER_ADDRESS: '서울시 강남구 …',
    });
    const result = await requestConsentedContact();
    expect(result).toEqual({
      status: 'provided',
      contact: {
        name: '이대영',
        phone: '01012345678',
        email: 'a@b.com',
        address: '서울시 강남구 …',
      },
    });
  });

  it('treats an old Toss app as unsupported, not as a refusal', async () => {
    // Below 5.264.0 the call resolves with undefined rather than failing.
    mocked.mockResolvedValue(undefined);
    expect(await requestConsentedContact()).toEqual({ status: 'unsupported' });
  });

  it.each(['USER_DECLINED', 'CANCELED'])(
    'reads %s as the customer saying no',
    async (code) => {
      mocked.mockRejectedValue({ code });
      expect(await requestConsentedContact()).toEqual({ status: 'declined', code });
    },
  );

  it.each(['TERMS_NOT_SET', 'INVALID_REQUEST'])(
    'reads %s as our own console setup being missing',
    async (code) => {
      mocked.mockRejectedValue({ code });
      expect(await requestConsentedContact()).toEqual({
        status: 'unconfigured',
        code,
      });
    },
  );

  it('does not claim success when the parcel could not be addressed', async () => {
    // Consent given, but Toss holds no address for this customer.
    mocked.mockResolvedValue({ USER_NAME: '이대영', USER_PHONE: '01012345678' });
    const result = await requestConsentedContact();
    expect(result.status).toBe('failed');
  });

  it('falls back rather than throwing when the call itself is unknown', async () => {
    mocked.mockRejectedValue(new Error('boom'));
    expect(await requestConsentedContact()).toEqual({
      status: 'failed',
      code: 'UNKNOWN',
    });
  });

  it('passes the retry flag through only when asked', async () => {
    mocked.mockResolvedValue(undefined);
    await requestConsentedContact();
    expect(mocked.mock.calls[0]![0]).toMatchObject({
      shouldRequestAgreementWhenUserDeclined: false,
    });
    await requestConsentedContact({ retryAfterDecline: true });
    expect(mocked.mock.calls[1]![0]).toMatchObject({
      shouldRequestAgreementWhenUserDeclined: true,
    });
  });
});

describe('reading the fields Toss returns', () => {
  it('drops blanks so an empty string never looks like an answer', () => {
    expect(toContact({ USER_NAME: '  ', USER_PHONE: '010' })).toEqual({
      name: undefined,
      phone: '010',
      email: undefined,
      address: undefined,
    });
  });

  it('needs a name, a number and an address before it can ship', () => {
    expect(isShippable({ name: 'a', phone: 'b', address: 'c' })).toBe(true);
    // Email is for the receipt, not the parcel.
    expect(isShippable({ name: 'a', phone: 'b', email: 'c' })).toBe(false);
  });
});
