import {useLoadScript} from '@shopify/hydrogen-react';
import {useEffect, useRef} from 'react';

export type ConsentStatus = 'true' | 'false' | '';

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

export type CustomerPrivacyApiLoaded = boolean;

export type CustomerPrivacyConsentConfig = {
  checkoutRootDomain?: string;
  storefrontRootDomain?: string;
  storefrontAccessToken?: string;
};

export type SetConsentHeadlessParams = VisitorConsent &
  CustomerPrivacyConsentConfig & {
    headlessStorefront?: boolean;
  };

/**
  Ideally this type should come from the Custoemr Privacy API sdk
  analyticsProcessingAllowed -
  currentVisitorConsent
  doesMerchantSupportGranularConsent
  firstPartyMarketingAllowed
  getCCPAConsent
  getRegulation
  getShopPrefs
  getTrackingConsent
  isRegulationEnforced
  marketingAllowed
  preferencesProcessingAllowed
  saleOfDataAllowed
  saleOfDataRegion
  setCCPAConsent
  setTrackingConsent
  shouldShowBanner
  shouldShowCCPABanner
  shouldShowGDPRBanner
  thirdPartyMarketingAllowed
**/
export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  userCanBeTracked: () => boolean;
  saleOfDataAllowed: () => boolean;
  marketingAllowed: () => boolean;
  analyticsProcessingAllowed: () => boolean;
  setTrackingConsent: (
    consent: SetConsentHeadlessParams,
    callback: () => void,
  ) => void;
};

export type PrivacyBanner = {
  loadBanner: (options: CustomerPrivacyConsentConfig) => void;
};

export interface CustomEventMap {
  visitorConsentCollected: CustomEvent<VisitorConsentCollected>;
  customerPrivacyApiLoaded: CustomEvent<CustomerPrivacyApiLoaded>;
}

export type PrivacyConsentBannerProps = {
  shopDomain: string;
  checkoutRootDomain: string;
  storefrontAccessToken: string;
};

export type CustomerPrivacyApiProps = PrivacyConsentBannerProps & {
  withPrivacyBanner: boolean;
  onVisitorConsentCollected?: (consent: VisitorConsentCollected) => void;
};

const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';
const CONSENT_API_WITH_BANNER =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

export function useCustomerPrivacy(props: CustomerPrivacyApiProps) {
  const {
    withPrivacyBanner = false,
    onVisitorConsentCollected,
    ...consentConfig
  } = props;
  const loadedEvent = useRef(false);
  const scriptStatus = useLoadScript(
    withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API,
    {
      attributes: {
        id: 'customer-privacy-api',
      },
    },
  );

  useEffect(() => {
    if (scriptStatus !== 'done' || loadedEvent.current) return;

    loadedEvent.current = true;

    if (withPrivacyBanner && window?.privacyBanner) {
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
  }, [
    scriptStatus,
    onVisitorConsentCollected,
    withPrivacyBanner,
    consentConfig,
  ]);

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
