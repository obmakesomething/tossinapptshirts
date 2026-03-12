type AnalyticsProperties = Record<string, unknown>;

// Analytics tracking utilities
export const trackEvent = (
  eventName: string,
  properties?: AnalyticsProperties,
) => {
  try {
    // Log to console for debugging
    console.log(`[Analytics] ${eventName}`, properties);

    // TODO: Add your analytics provider here (e.g., Amplitude, Mixpanel, GA)
    // Example: amplitude.track(eventName, properties);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

export const trackClick = (
  eventName: string,
  properties?: AnalyticsProperties,
) => {
  trackEvent(eventName, properties);
};

export const trackImpression = (
  eventName: string,
  properties?: AnalyticsProperties,
) => {
  trackEvent(eventName, properties);
};

// Order events
export const trackOrderCreated = (
  orderId: string,
  amount: number,
  currency = 'KRW',
) => {
  trackEvent('order_created', {
    order_id: orderId,
    amount,
    currency,
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentSuccess = (
  orderId: string,
  amount: number,
  paymentMethod: string,
  currency = 'KRW',
) => {
  trackEvent('payment_success', {
    order_id: orderId,
    amount,
    currency,
    payment_method: paymentMethod,
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentFailed = (
  orderId: string,
  amount: number,
  reason: string,
  currency = 'KRW',
) => {
  trackEvent('payment_failed', {
    order_id: orderId,
    amount,
    currency,
    reason,
    timestamp: new Date().toISOString(),
  });
};

// Screen views
export const trackScreenView = (
  screenName: string,
  properties?: AnalyticsProperties,
) => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

// Image generation events
export const trackImageGenerated = (
  prompt: string,
  style: string,
  aspectRatio: string,
) => {
  trackEvent('image_generated', {
    prompt,
    style,
    aspect_ratio: aspectRatio,
    timestamp: new Date().toISOString(),
  });
};

export const trackImageUploaded = (source: string) => {
  trackEvent('image_uploaded', {
    source,
    timestamp: new Date().toISOString(),
  });
};

// Photo management events
export const trackPhotoReplaceClick = (placement: string) => {
  trackEvent('photo_replace_click', {
    placement,
    timestamp: new Date().toISOString(),
  });
};

export const trackPhotoAddClick = (placement: string, currentCount: number) => {
  trackEvent('photo_add_click', {
    placement,
    current_photo_count: currentCount,
    timestamp: new Date().toISOString(),
  });
};

export const trackPhotoRemoveClick = (
  placement: string,
  photoIndex: number,
) => {
  trackEvent('photo_remove_click', {
    placement,
    photo_index: photoIndex,
    timestamp: new Date().toISOString(),
  });
};

export const trackPhotoRemoveConfirm = (
  placement: string,
  photoIndex: number,
) => {
  trackEvent('photo_remove_confirm', {
    placement,
    photo_index: photoIndex,
    timestamp: new Date().toISOString(),
  });
};

export const trackPhotoSelectThumbnail = (
  placement: string,
  photoIndex: number,
) => {
  trackEvent('photo_select_thumbnail', {
    placement,
    photo_index: photoIndex,
    timestamp: new Date().toISOString(),
  });
};
