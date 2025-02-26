// @description Google Tag Manager component to listen to analytics events.
import {useAnalytics} from '@shopify/hydrogen';
import {useEffect} from 'react';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export function GoogleTagManager() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Google Tag Manager');

  useEffect(() => {
    subscribe('product_viewed', () => {
      // Triggering a custom event in GTM when a product is viewed
      window.dataLayer.push({event: 'viewed-product'});
    });

    ready();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
