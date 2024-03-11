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

type CustomerPrivacyConsentConfig = {
  checkoutRootDomain?: string;
  storefrontRootDomain?: string;
  storefrontAccessToken?: string;
};

type SetConsentHeadlessParams = VisitorConsent &
  CustomerPrivacyConsentConfig & {
    headlessStorefront?: boolean;
  };

export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  userCanBeTracked: () => boolean;
  setTrackingConsent: (
    consent: SetConsentHeadlessParams,
    callback: () => void,
  ) => void;
};

type PrivacyBanner = {
  loadBanner: (options: CustomerPrivacyConsentConfig) => void;
};

interface CustomEventMap {
  visitorConsentCollected: CustomEvent<VisitorConsentCollected>;
}

// TODO: Move this to a global.d.ts file
declare global {
  interface Window {
    privacyBanner: PrivacyBanner;
    Shopify: {
      customerPrivacy: CustomerPrivacy;
    };
  }
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void,
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
}

export type PrivacyConsentBannerProps = {
  shopDomain: string;
  checkoutRootDomain: string;
  storefrontAccessToken: string;
};

type CustomerPrivacyApiProps = {
  consentConfig: PrivacyConsentBannerProps;
  withPrivacyBanner: boolean;
  onVisitorConsentCollected?: (consent: VisitorConsentCollected) => void;
};

const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';
const CONSENT_API_WITH_BANNER =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

export function useCustomerPrivacyApi(props: CustomerPrivacyApiProps) {
  const nonce = useNonce();
  const withBanner = props.withPrivacyBanner || false;
  const consentConfig = props.consentConfig;
  const scriptStatus = useLoadScript(
    withBanner ? CONSENT_API_WITH_BANNER : CONSENT_API,
    {
      attributes: {
        id: 'customer-privacy-api',
        nonce: nonce || '',
      },
    },
  );
  const onVisitorConsentCollected = props.onVisitorConsentCollected;

  useEffect(() => {
    if (scriptStatus !== 'done') return;

    if (withBanner) {
      window?.privacyBanner?.loadBanner(consentConfig);
    }

    if (onVisitorConsentCollected) {
      document.addEventListener(
        'visitorConsentCollected',
        (event: CustomEvent<VisitorConsentCollected>) => {
          onVisitorConsentCollected(event.detail);
        },
      );
    }

    // Override the setTrackingConsent method to include the headless storefront configuration
    if (window.Shopify?.customerPrivacy) {
      const originalSetTrackingConsent =
        window.Shopify.customerPrivacy.setTrackingConsent;
      window.Shopify.customerPrivacy.setTrackingConsent = (
        consent: VisitorConsent,
        callback: () => void,
      ) => {
        originalSetTrackingConsent(
          {
            ...consent,
            headlessStorefront: true,
            checkoutRootDomain: consentConfig.checkoutRootDomain,
            storefrontAccessToken: consentConfig.storefrontAccessToken,
          },
          callback,
        );
      };
    }
  }, [scriptStatus, onVisitorConsentCollected]);

  return;
}

export function getCustomerPrivacy() {
  try {
    return window.Shopify && window.Shopify.customerPrivacy
      ? window.Shopify?.customerPrivacy
      : null;
  } catch (e) {
    return null;
  }
}

export function getCustomerPrivacyRequired() {
  const customerPrivacy = getCustomerPrivacy();

  if (!customerPrivacy) {
    throw new Error(
      'Shopify Customer Privacy API not available. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacyApi().',
    );
  }

  return customerPrivacy;
}
