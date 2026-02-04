// Analytics tracking utilities
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    // Log to console for debugging
    console.log(`[Analytics] ${eventName}`, properties);

    // TODO: Add your analytics provider here (e.g., Amplitude, Mixpanel, GA)
    // Example: amplitude.track(eventName, properties);

  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

// Order events
export const trackOrderCreated = (orderId: string, amount: number, currency: string = 'KRW') => {
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
  currency: string = 'KRW'
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
  currency: string = 'KRW'
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
export const trackScreenView = (screenName: string, properties?: Record<string, any>) => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

// Image generation events
export const trackImageGenerated = (prompt: string, style: string, aspectRatio: string) => {
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
