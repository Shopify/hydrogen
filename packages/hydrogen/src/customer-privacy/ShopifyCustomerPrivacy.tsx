import {useLoadScript} from '@shopify/hydrogen-react';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
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
  checkoutRootDomain: string;
  storefrontRootDomain?: string;
  storefrontAccessToken: string;
  country?: CountryCode;
  /** The privacyBanner refers to `language` as `locale`  */
  locale?: LanguageCode;
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
    callback: (data: {error: string} | undefined) => void,
  ) => void;
};

// NOTE: options is optional because we override these method(s) with  pre-applied options
export type PrivacyBanner = {
  /* Display the privacy banner */
  loadBanner: (options?: Partial<CustomerPrivacyConsentConfig>) => void;
  /* Display the consent preferences banner */
  showPreferences: (options?: Partial<CustomerPrivacyConsentConfig>) => void;
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
  /** Country code for the shop. */
  country?: CountryCode;
  /** Language code for the shop. */
  locale?: LanguageCode;
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
  const privacyBannerOverritten = useRef(false);
  const customerPrivacyOverritten = useRef(false);
  const loadedEvent = useRef(false);
  const scriptStatus = useLoadScript(
    withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API,
    {
      attributes: {
        id: 'customer-privacy-api',
      },
    },
  );

  const customerPrivacy = getCustomerPrivacy();
  const privacyBanner = getPrivacyBanner();

  // settings event listeners for visitorConsentCollected
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

  // maybe auto load the banner and override the setTrackingConsent method
  useEffect(() => {
    if (scriptStatus !== 'done' || loadedEvent.current) return;
    loadedEvent.current = true;

    const {checkoutDomain, storefrontAccessToken} = consentConfig;
    if (!checkoutDomain) logMissingConfig('checkoutDomain');
    if (!storefrontAccessToken) logMissingConfig('storefrontAccessToken');

    // validate that the storefront access token is not a server API token
    if (
      storefrontAccessToken.startsWith('shpat_') ||
      storefrontAccessToken.length !== 32
    ) {
      // eslint-disable-next-line no-console
      console.error(
        `[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token`,
      );
    }

    const storefrontRootDomain = parseStoreDomain(checkoutDomain);

    const config: CustomerPrivacyConsentConfig = {
      checkoutRootDomain: checkoutDomain,
      storefrontAccessToken,
      storefrontRootDomain,
      country: consentConfig.country,
      locale: consentConfig.locale,
    };

    // if the store domain is not set, we will try to set it based on the checkout domain
    if (customerPrivacy && !customerPrivacyOverritten.current) {
      customerPrivacyOverritten.current = true;
      overrideCustomerPrivacysetTrackingConsent({config, customerPrivacy});
    }

    if (privacyBanner && !privacyBannerOverritten.current) {
      privacyBannerOverritten.current = true;
      overridePrivacyBannerShowPreferences({config, privacyBanner});

      const loadBanner = overridePrivacyBannerLoadBanner({
        config,
        privacyBanner,
      });
      if (withPrivacyBanner && loadBanner) {
        // auto load the banner if applicable
        loadBanner();
      }
    }

    if (!customerPrivacy) return;

    onReady && onReady();
  }, [
    scriptStatus,
    withPrivacyBanner,
    consentConfig,
    customerPrivacy,
    privacyBanner,
    onReady,
  ]);

  return;
}

/**
 * Extracts the root domain from the checkout domain otherwise returns the checkout domain.
 */
function parseStoreDomain(checkoutDomain: string) {
  if (typeof window === 'undefined') return;

  const host = window.document.location.host;
  const checkoutDomainParts = checkoutDomain.split('.').reverse();
  const currentDomainParts = host.split('.').reverse();
  const sameDomainParts: Array<string> = [];
  checkoutDomainParts.forEach((part, index) => {
    if (part === currentDomainParts[index]) {
      sameDomainParts.push(part);
    }
  });

  const storefrontRootDomain = sameDomainParts.reverse().join('.');

  if (!storefrontRootDomain) {
    return checkoutDomain;
  }

  return storefrontRootDomain;
}

/**
 * Overrides the customerPrivacy.setTrackingConsent method to include the headless storefront configuration.
 */
function overrideCustomerPrivacysetTrackingConsent({
  customerPrivacy,
  config,
}: {
  customerPrivacy: CustomerPrivacy;
  config: CustomerPrivacyConsentConfig;
}) {
  if (!customerPrivacy || !config) {
    return;
  }

  // Override the setTrackingConsent method to include the headless storefront configuration
  const original = customerPrivacy.setTrackingConsent;

  function updatedSetTrackingConsent(
    consent: VisitorConsent,
    callback: (data: {error: string} | undefined) => void,
  ) {
    original(
      {
        ...consent,
        headlessStorefront: true,
        ...config,
      },
      callback,
    );
  }

  // preset our config so that 3rd parties don't need to pass it in. They will need
  // to only pass in the consent choices {marketing, analytics, preferences, sale_of_data}
  window.Shopify.customerPrivacy.setTrackingConsent = updatedSetTrackingConsent;

  return updatedSetTrackingConsent;
}

/**
 * Overrides the privacyBanner.loadBanner method to include the headless storefront configuration.
 */
function overridePrivacyBannerLoadBanner({
  privacyBanner,
  config,
}: {
  privacyBanner: PrivacyBanner;
  config: CustomerPrivacyConsentConfig;
}) {
  if (!privacyBanner?.loadBanner || !config) {
    return;
  }

  const original = privacyBanner.loadBanner;

  function updatedLoadBanner(
    userConfig?: Partial<CustomerPrivacyConsentConfig>,
  ) {
    if (typeof userConfig === 'object') {
      const mergedConfig = {...config, ...userConfig};
      original(mergedConfig);
      return;
    }
    original(config);
  }

  window.privacyBanner.loadBanner = updatedLoadBanner;
  return updatedLoadBanner;
}

/*
 * Overrides the privacyBanner.showPreferences method to include the headless storefront configuration.
 */
function overridePrivacyBannerShowPreferences({
  privacyBanner,
  config,
}: {
  privacyBanner: PrivacyBanner;
  config: CustomerPrivacyConsentConfig;
}) {
  if (!privacyBanner?.showPreferences || !config) {
    return;
  }

  const original = privacyBanner.showPreferences;

  function updatedShowPreferences(
    userConfig?: Partial<CustomerPrivacyConsentConfig>,
  ) {
    if (typeof userConfig === 'object') {
      const mergedConfig = {...config, ...userConfig};
      original(mergedConfig);
      return;
    }
    original(config);
  }

  window.privacyBanner.showPreferences = updatedShowPreferences;
  return updatedShowPreferences;
}

/*
 * Returns Shopify's customerPrivacy methods if loaded in the `window` object.
 * @returns CustomerPrivacy | null
 * @example
 * ```ts
 * const customerPrivacy = getCustomerPrivacy()
 *
 * if (customerPrivacy) {
 *  // get the current visitor consent
 *  const visitorConsent = customerPrivacy.currentVisitorConsent()
 *
 *  // set the tracking consent
 *  customerPrivacy.setTrackingConsent({marketing: true...}, () => {
 *    // do something after the consent is set
 *  })
 *
 *  // check if marketing is allowed
 *  const marketingAllowed = customerPrivacy.marketingAllowed()
 *  console.log(marketingAllowed)
 *
 *  // check if analytics is allowed
 *  const analyticsAllowed = customerPrivacy.analyticsProcessingAllowed()
 *  console.log(analyticsAllowed)
 *
 *  // check if preferences are allowed
 *  const preferencesAllowed = customerPrivacy.preferencesProcessingAllowed()
 *  console.log(preferencesAllowed)
 *
 *  // check if sale of data is allowed
 *  const saleOfDataAllowed = customerPrivacy.saleOfDataAllowed()
 *
 *  // check if third party marketing is allowed
 *  const thirdPartyMarketingAllowed = customerPrivacy.thirdPartyMarketingAllowed()
 *
 *  // check if first party marketing is allowed
 *  const firstPartyMarketingAllowed = customerPrivacy.firstPartyMarketingAllowed()
 *
 *  // check if the banner should be shown
 *  const shouldShowBanner = customerPrivacy.shouldShowBanner()
 *
 *  // check if the GDPR banner should be shown
 *  const shouldShowGDPRBanner = customerPrivacy.shouldShowGDPRBanner()
 *
 *  // check if the CCPA banner should be shown
 *  const shouldShowCCPABanner = customerPrivacy.shouldShowCCPABanner()
 *
 *  // check if the regulation is enforced
 *  const isRegulationEnforced = customerPrivacy.isRegulationEnforced()
 *
 *  // get the regulation
 *  const regulation = customerPrivacy.getRegulation()
 *
 *  // get the sale of data region
 *  const saleOfDataRegion = customerPrivacy.saleOfDataRegion()
 *
 *  // get the shop preferences
 *  const shopPrefs = customerPrivacy.getShopPrefs()
 *
 *  // get the tracking consent
 *  const trackingConsent = customerPrivacy.getTrackingConsent()
 *
 *  // get the CCPA consent
 *  const ccpaConsent = customerPrivacy.getCCPAConsent()
 *
 *  // check if the merchant supports granular consent
 *  const doesMerchantSupportGranularConsent = customerPrivacy.doesMerchantSupportGranularConsent()
 * }
 * ```
 */
export function getCustomerPrivacy() {
  try {
    return window.Shopify && window.Shopify.customerPrivacy
      ? (window.Shopify?.customerPrivacy as CustomerPrivacy)
      : null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns Shopify's privacyBanner methods if loaded in the `window` object.
 * @returns PrivacyBanner | null
 * @example
 * ```ts
 *  const privacyBanner = getPrivacyBanner()
 *
 *  if (privacyBanner) {
 *   // show the banner
 *   privacyBanner.loadBanner()
 *
 *    // show the preferences
 *    privacyBanner.showPreferences()
 *   }
 * ```
 */
export function getPrivacyBanner() {
  try {
    return window && window?.privacyBanner
      ? (window.privacyBanner as PrivacyBanner)
      : null;
  } catch (e) {
    return null;
  }
}
