import { eventLog } from '@apps-in-toss/framework';

type LogType = 'event' | 'screen' | 'click' | 'impression';
type AnalyticsParams = Record<string, unknown>;
let analyticsSessionId = '';

const createAnalyticsSessionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getAnalyticsSessionId = () => {
  if (!analyticsSessionId) {
    analyticsSessionId = createAnalyticsSessionId();
  }
  return analyticsSessionId;
};

const inferScreenId = (eventName: string, properties?: AnalyticsParams) => {
  if (typeof properties?.screen_name === 'string' && properties.screen_name.trim()) {
    return properties.screen_name.trim();
  }
  if (eventName.endsWith('_screen_view')) {
    return eventName.replace(/_screen_view$/, '');
  }
  const [segment] = eventName.split('_');
  return segment || 'unknown';
};

const createAitAnalyticsBase = (eventName: string, properties?: AnalyticsParams) => ({
  event_time: new Date().toISOString(),
  screen_id: inferScreenId(eventName, properties),
  session_id: getAnalyticsSessionId(),
  app_platform: 'toss_webview',
});

const serializeParams = (properties?: AnalyticsParams) => {
  if (!properties) return {};
  const entries = Object.entries(properties).map(([key, value]) => {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return [key, value] as const;
    }
    try {
      return [key, JSON.stringify(value)] as const;
    } catch {
      return [key, String(value)] as const;
    }
  });
  return Object.fromEntries(entries);
};

// Analytics tracking utilities (Apps in Toss eventLog)
export const trackEvent = (
  eventName: string,
  properties?: AnalyticsParams,
  logType: LogType = 'event',
) => {
  try {
    const payload = {
      log_name: eventName,
      log_type: logType,
      params: serializeParams({
        ...createAitAnalyticsBase(eventName, properties),
        ...properties,
        tracked_at: new Date().toISOString(),
      }),
    } as const;

    void eventLog(payload).catch((error) => {
      console.error('[Analytics] Error sending event:', error);
    });
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

export const trackClick = (
  eventName: string,
  properties?: AnalyticsParams,
) => {
  trackEvent(eventName, properties, 'click');
};

export const trackImpression = (
  eventName: string,
  properties?: AnalyticsParams,
) => {
  trackEvent(eventName, properties, 'impression');
};

// Order events
export const trackOrderCreated = (orderId: string, amount: number, currency: string = 'KRW') => {
  trackEvent('order_created', {
    order_id: orderId,
    amount,
    currency,
  });
};

export const trackPaymentSuccess = (
  orderId: string,
  amount: number,
  paymentMethod: string,
  currency: string = 'KRW'
) => {
  trackEvent('payment_success', {
    order_id: orderId,
    amount,
    currency,
    payment_method: paymentMethod,
  });
};

export const trackPaymentFailed = (
  orderId: string,
  amount: number,
  reason: string,
  currency: string = 'KRW'
) => {
  trackEvent('payment_failed', {
    order_id: orderId,
    amount,
    currency,
    reason,
  });
};

// Screen views
export const trackScreenView = (screenName: string, properties?: AnalyticsParams) => {
  trackEvent(`${screenName}_screen_view`, {
    screen_name: screenName,
    ...properties,
  }, 'screen');
};

// Image generation events
export const trackImageGenerated = (prompt: string, style: string, aspectRatio: string) => {
  trackEvent('image_generated', {
    prompt,
    style,
    aspect_ratio: aspectRatio,
  });
};

export const trackImageUploaded = (source: string) => {
  trackEvent('image_uploaded', {
    source,
  });
};

// Photo management events
export const trackPhotoReplaceClick = (placement: string) => {
  trackClick('photo_replace_click', {
    placement,
  });
};

export const trackPhotoAddClick = (placement: string, currentCount: number) => {
  trackClick('photo_add_click', {
    placement,
    current_photo_count: currentCount,
  });
};

export const trackPhotoRemoveClick = (placement: string, photoIndex: number) => {
  trackClick('photo_remove_click', {
    placement,
    photo_index: photoIndex,
  });
};

export const trackPhotoRemoveConfirm = (placement: string, photoIndex: number) => {
  trackClick('photo_remove_confirm', {
    placement,
    photo_index: photoIndex,
  });
};

export const trackPhotoSelectThumbnail = (placement: string, photoIndex: number) => {
  trackClick('photo_select_thumbnail', {
    placement,
    photo_index: photoIndex,
  });
};
