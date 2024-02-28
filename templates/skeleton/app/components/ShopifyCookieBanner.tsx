import {Script, useLoadScript} from '@shopify/hydrogen';
import {useEffect, useRef} from 'react';

declare global {
  interface Window {
    privacyBanner: {
      loadBanner: (options: PrivacyConsentBannerProps) => void;
    };
  }
}

type PrivacyConsentBannerProps = {
  checkoutRootDomain: string;
  storefrontAccessToken: string;
  storefrontRootDomain: string;
};

/**
 * A component that loads the Shopify privacy consent banner.
 * @param props - The props to pass to the privacy consent banner.
 * @returns A component that loads the Shopify privacy consent banner.
 * @link https://shopify.dev/docs/api/customer-privacy#installation-on-a-custom-storefront
 * @example while testing you can force the banner pass ?preview_privacy_banner=1
 */
export function ShopifyCookieBanner(props: PrivacyConsentBannerProps) {
  const loaded = useRef(false);
  const status = useLoadScript(
    'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js',
  );

  // window.Shopify.customerPrivacy.currentVisitorConsent();
  // {marketing: 'yes', analytics: 'no', preferences: 'yes', sale_of_data: '', gpc: ''}

  useEffect(() => {
    function handleConsentCollected(event: any) {
      console.log('visitorConsentCollected', event.detail);
    }

    if (status !== 'done' || !window?.privacyBanner || loaded.current) {
      return;
    }

    // listen for the visitorConsentCollected event
    document.addEventListener(
      'visitorConsentCollected',
      handleConsentCollected,
    );

    window?.privacyBanner?.loadBanner(props);

    loaded.current = true;

    return () => {
      document.removeEventListener(
        'visitorConsentCollected',
        handleConsentCollected,
      );
    };
  }, [props, status]);

  useEffect(() => {
    if (!window?.Shopify?.customerPrivacy) return;
    console.log(
      'userCanBeTracked',
      window?.Shopify?.customerPrivacy?.userCanBeTracked(),
    );
  }, []);

  return null;
}
