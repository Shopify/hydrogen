import {useLoadScript} from '@shopify/hydrogen-react';
import {useEffect, useRef} from 'react';

export type ConsentStatus = boolean | undefined;

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
  preferencesProcessingAllowed: () => boolean;
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

export type CustomerPrivacyApiProps = {
  /** The production shop checkout domain url.  */
  checkoutDomain: string;
  /** The storefront access token for the shop. */
  storefrontAccessToken: string;
  /** Whether to load the Shopify privacy banner as configured in Shopify admin. Defaults to true. */
  withPrivacyBanner?: boolean;
  /** Callback to be called when visitor consent is collected. */
  onVisitorConsentCollected?: (consent: VisitorConsentCollected) => void;
  /** Callback to be call when customer privacy api is ready. */
  onReady?: () => void;
};

const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';
const CONSENT_API_WITH_BANNER =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

function logMissingConfig(fieldName: string) {
  // eslint-disable-next-line no-console
  console.error(
    `[h2:error:useCustomerPrivacy] Unable to setup Customer Privacy API: Missing consent.${fieldName} configuration.`,
  );
}

export function useCustomerPrivacy(props: CustomerPrivacyApiProps) {
  const {
    withPrivacyBanner = true,
    onVisitorConsentCollected,
    onReady,
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
    const consentCollectedHandler = (
      event: CustomEvent<VisitorConsentCollected>,
    ) => {
      if (onVisitorConsentCollected) {
        onVisitorConsentCollected(event.detail);
      }
    };

    document.addEventListener(
      'visitorConsentCollected',
      consentCollectedHandler,
    );

    return () => {
      document.removeEventListener(
        'visitorConsentCollected',
        consentCollectedHandler,
      );
    };
  }, [onVisitorConsentCollected]);

  useEffect(() => {
    if (scriptStatus !== 'done' || loadedEvent.current) return;
    loadedEvent.current = true;

    if (!consentConfig.checkoutDomain) logMissingConfig('checkoutDomain');
    if (!consentConfig.storefrontAccessToken)
      logMissingConfig('storefrontAccessToken');

    // validate that the storefront access token is not a server API token
    if (
      consentConfig.storefrontAccessToken.startsWith('shpat_') ||
      consentConfig.storefrontAccessToken.length !== 32
    ) {
      // eslint-disable-next-line no-console
      console.error(
        `[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token`,
      );
    }

    if (withPrivacyBanner && window?.privacyBanner) {
      window?.privacyBanner?.loadBanner({
        checkoutRootDomain: consentConfig.checkoutDomain,
        storefrontAccessToken: consentConfig.storefrontAccessToken,
      });
    }

    if (!window.Shopify?.customerPrivacy) return;

    // Override the setTrackingConsent method to include the headless storefront configuration
    const originalSetTrackingConsent =
      window.Shopify.customerPrivacy.setTrackingConsent;

    function overrideSetTrackingConsent(
      consent: VisitorConsent,
      callback: (data: {error: string} | undefined) => void,
    ) {
      originalSetTrackingConsent(
        {
          ...consent,
          headlessStorefront: true,
          checkoutRootDomain: consentConfig.checkoutDomain,
          storefrontAccessToken: consentConfig.storefrontAccessToken,
        },
        callback,
      );
    }

    window.Shopify.customerPrivacy.setTrackingConsent =
      overrideSetTrackingConsent;

    if (onReady && !withPrivacyBanner) {
      onReady();
    }
  }, [scriptStatus, withPrivacyBanner, consentConfig]);

  return;
}

export function getCustomerPrivacy(): CustomerPrivacy | null {
  try {
    return window.Shopify && window.Shopify.customerPrivacy
      ? window.Shopify?.customerPrivacy
      : null;
  } catch (e) {
    return null;
  }
}
