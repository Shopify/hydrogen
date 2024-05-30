// [START import]
import {useAnalytics} from '@shopify/hydrogen';
// [END import]
import {useEffect} from 'react';

// [START export]
export function ThirdPartyAnalyticsIntegration() {
  // [START use]
  const {subscribe, register} = useAnalytics();
  // [END use]
  // [START register]
  // Register this analytics integration - this will prevent any analytics events
  // from being sent until this integration is ready
  const {ready} = register('Third Party Analytics Integration');
  // [END register]

  useEffect(() => {
    // [START subscribe]
    // Standard events
    subscribe('page_viewed', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Page viewed:', data);
    });
    subscribe('product_viewed', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Product viewed:', data);
    });
    subscribe('collection_viewed', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Collection viewed:', data);
    });
    subscribe('cart_viewed', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Cart viewed:', data);
    });
    subscribe('cart_updated', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Cart updated:', data);
    });

    // Custom events
    subscribe('custom_checkbox_toggled', (data) => {
      console.log('ThirdPartyAnalyticsIntegration - Custom checkbox toggled:', data);
    });
    // [END subscribe]

    // [START ready]
    // Mark this analytics integration as ready as soon as it's done setting up
    ready();
    // [END ready]
  }, []);

  return null;
}
// [END export]
