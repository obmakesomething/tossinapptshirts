import { eventLog } from '@apps-in-toss/framework';
import { trackClick, trackScreenView } from './analytics';

jest.mock('@apps-in-toss/framework', () => ({
  eventLog: jest.fn().mockResolvedValue(undefined),
}));

const mockedEventLog = eventLog as jest.MockedFunction<typeof eventLog>;

describe('analytics naming', () => {
  beforeEach(() => {
    mockedEventLog.mockClear();
  });

  it('appends today date to click event name and all param keys', () => {
    trackClick('home_primary_cta_click', {
      product_id: 'p-001',
      amount: 10000,
    });

    expect(mockedEventLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_name: 'home_primary_cta_click_20260321',
        log_type: 'click',
        params: expect.objectContaining({
          screen_id_20260321: 'home',
          session_id_20260321: expect.any(String),
          app_platform_20260321: 'toss_webview',
          product_id_20260321: 'p-001',
          amount_20260321: 10000,
        }),
      }),
    );
  });

  it('appends today date to screen event name and built-in params', () => {
    trackScreenView('home', { entry: 'root' });

    expect(mockedEventLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_name: 'home_screen_view_20260321',
        log_type: 'screen',
        params: expect.objectContaining({
          screen_id_20260321: 'home',
          session_id_20260321: expect.any(String),
          app_platform_20260321: 'toss_webview',
          screen_name_20260321: 'home',
          entry_20260321: 'root',
        }),
      }),
    );
  });
});
