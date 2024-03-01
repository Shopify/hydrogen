import {useLoadScript, useNonce} from '@shopify/hydrogen';
import {useEffect} from 'react';

type ConsentStatus = 'true' | 'false' | '';

export type VisitorConsent = {
  marketing: ConsentStatus;
  analytics: ConsentStatus;
  preferences: ConsentStatus;
  sale_of_data: ConsentStatus;
};

export type VisitorConsentCollected = {
  analyticsAllowed: boolean;
  firstPartyMarketingAllowed: boolean;
  marketingAllowed: boolean;
  preferencesAllowed: boolean;
  saleOfDataAllowed: boolean;
  thirdPartyMarketingAllowed: boolean;
};

export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  userCanBeTracked: () => boolean;
};

type PrivacyBanner = {
  loadBanner: (options: PrivacyConsentBannerProps) => void;
}

interface CustomEventMap {
  "visitorConsentCollected": CustomEvent<VisitorConsentCollected>;
}
declare global {
  interface Window {
    privacyBanner: PrivacyBanner;
    Shopify: {
      customerPrivacy: CustomerPrivacy;
    };
  }
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(type: K,
       listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
}

export type PrivacyConsentBannerProps = {
  checkoutRootDomain: string;
  shopDomain: string;
  storefrontAccessToken: string;
  storefrontRootDomain: string;
};

type CustomerPrivacyApiProps = {
  onVisitorConsentCollected?: (consent: VisitorConsentCollected) => void;
};

type CustomerPrivacyApiWithPrivacyBannerProps = CustomerPrivacyApiProps & {
  consentConfig: PrivacyConsentBannerProps;
};

const CONSENT_API = 'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';
const CONSENT_API_WITH_BANNER = 'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

export function useCustomerPrivacyApi(props: CustomerPrivacyApiProps = {}) {
  const nonce = useNonce();
  const scriptStatus = useLoadScript(
    CONSENT_API,
    {
      attributes: {
        id: 'consent-management-api',
        nonce: nonce || '',
      },
    }
  )
  const onVisitorConsentCollected = props.onVisitorConsentCollected;

  useEffect(() => {
    if (scriptStatus !== 'done') return;

    if (onVisitorConsentCollected) {
      document.addEventListener('visitorConsentCollected', (event: CustomEvent<VisitorConsentCollected>) => {
        onVisitorConsentCollected(event.detail);
      });
    }
  }, [scriptStatus, onVisitorConsentCollected]);

  return;
}

export function getCustomerPrivacy() {
  try {
    return window.Shopify && window.Shopify.customerPrivacy ? window.Shopify?.customerPrivacy : null;
  } catch (e) {
    return null;
  }
}

export function getCustomerPrivacyRequired() {
  const customerPrivacy = getCustomerPrivacy();

  if(!customerPrivacy) {
    throw new Error('Shopify Customer Privacy API not available. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacyApi().');
  }

  return customerPrivacy;
}

export function useCustomerPrivacyApiWithPrivacyBanner(props: CustomerPrivacyApiWithPrivacyBannerProps) {
  const nonce = useNonce();
  const scriptStatus = useLoadScript(
    CONSENT_API_WITH_BANNER,
    {
      attributes: {
        id: 'consent-privacy-banner',
        nonce: nonce || '',
      },
    }
  );
  const onVisitorConsentCollected = props.onVisitorConsentCollected;

  useEffect(() => {
    if (scriptStatus !== 'done') return;

    window?.privacyBanner?.loadBanner(props.consentConfig);

    if (onVisitorConsentCollected) {
      document.addEventListener('visitorConsentCollected', (event: CustomEvent<VisitorConsentCollected>) => {
        onVisitorConsentCollected(event.detail);
      });
    }
  }, [scriptStatus, props]);

  return;
}

export function getPrivacyBanner() {
  try {
    return window && window.privacyBanner ? window.privacyBanner : null;
  } catch (e) {
    return null;
  }
}
