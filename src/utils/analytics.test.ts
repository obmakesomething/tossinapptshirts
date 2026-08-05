import { eventLog } from '@apps-in-toss/native-modules';
import { trackClick, trackScreenView } from './analytics';

jest.mock('@apps-in-toss/native-modules', () => ({
  eventLog: jest.fn().mockResolvedValue(undefined),
}));

const mockedEventLog = eventLog as jest.MockedFunction<typeof eventLog>;

describe('analytics naming', () => {
  beforeEach(() => {
    mockedEventLog.mockClear();
  });

  it('keeps click event names and param keys stable, with the date as a param', () => {
    trackClick('home_primary_cta_click', {
      product_id: 'p-001',
      amount: 10000,
    });

    expect(mockedEventLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_name: 'home_primary_cta_click',
        log_type: 'click',
        params: expect.objectContaining({
          screen_id: 'home',
          session_id: expect.any(String),
          app_platform: 'toss_webview',
          product_id: 'p-001',
          amount: 10000,
          event_time: expect.any(String),
          tracked_at: expect.any(String),
        }),
      }),
    );
  });

  it('keeps screen event names and built-in params stable', () => {
    trackScreenView('home', { entry: 'root' });

    expect(mockedEventLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_name: 'home_screen_view',
        log_type: 'screen',
        params: expect.objectContaining({
          screen_id: 'home',
          session_id: expect.any(String),
          app_platform: 'toss_webview',
          screen_name: 'home',
          entry: 'root',
        }),
      }),
    );
  });
});
