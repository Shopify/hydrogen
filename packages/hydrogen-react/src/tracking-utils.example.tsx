import {getTrackingValues} from '@shopify/hydrogen-react';

export function sendCustomAnalyticsEvent(eventName: string) {
  const {uniqueToken, visitToken} = getTrackingValues();

  // Use tracking values in your custom analytics implementation
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: eventName,
      uniqueToken,
      visitToken,
    }),
  });
}
