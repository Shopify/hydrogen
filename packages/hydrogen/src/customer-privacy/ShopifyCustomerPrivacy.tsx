import {useLoadScript} from '@shopify/hydrogen-react';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {useEffect, useMemo, useRef, useState} from 'react';

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
export type OriginalCustomerPrivacy = {
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

export type CustomerPrivacy = Omit<
  OriginalCustomerPrivacy,
  'setTrackingConsent'
> & {
  setTrackingConsent: (
    consent: VisitorConsent, // we have already applied the headlessStorefront in the override
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

export const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';
export const CONSENT_API_WITH_BANNER =
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

  // Load the Shopify customer privacy API with or without the privacy banner
  // NOTE: We no longer use the status because we need `ready` to be not when the script is loaded
  // but instead when both `privacyBanner` (optional) and customerPrivacy are loaded in the window
  useLoadScript(withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API, {
    attributes: {
      id: 'customer-privacy-api',
    },
  });

  const {observing, setLoaded} = useApisLoaded({
    withPrivacyBanner,
    onLoaded: onReady,
  });

  const config = useMemo(() => {
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

    const config: CustomerPrivacyConsentConfig = {
      checkoutRootDomain: checkoutDomain,
      storefrontAccessToken,
      storefrontRootDomain: parseStoreDomain(checkoutDomain),
      country: consentConfig.country,
      locale: consentConfig.locale,
    };

    return config;
  }, [consentConfig, parseStoreDomain, logMissingConfig]);

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

  // monitor when the `privacyBanner` is in the window and override it's methods with config
  // pre-applied versions
  useEffect(() => {
    if (!withPrivacyBanner || observing.current.privacyBanner) return;
    observing.current.privacyBanner = true;

    let customPrivacyBanner: PrivacyBanner | undefined = undefined;

    const privacyBannerWatcher = {
      configurable: true,
      get() {
        return customPrivacyBanner;
      },
      set(value: unknown) {
        if (
          typeof value === 'object' &&
          value !== null &&
          'showPreferences' in value &&
          'loadBanner' in value
        ) {
          const privacyBanner = value as PrivacyBanner;

          // auto load the banner if applicable
          privacyBanner.loadBanner(config);

          // overwrite the privacyBanner methods
          customPrivacyBanner = overridePrivacyBannerMethods({
            privacyBanner,
            config,
          });

          // set the loaded state for the privacyBanner
          setLoaded.privacyBanner();
          emitCustomerPrivacyApiLoaded();
        }
      },
    };

    Object.defineProperty(window, 'privacyBanner', privacyBannerWatcher);
  }, [
    withPrivacyBanner,
    config,
    overridePrivacyBannerMethods,
    setLoaded.privacyBanner,
  ]);

  // monitor when the Shopify.customerPrivacy is added to the window and override the
  // setTracking consent method with the config pre-applied
  useEffect(() => {
    if (observing.current.customerPrivacy) return;
    observing.current.customerPrivacy = true;

    let customCustomerPrivacy: CustomerPrivacy | null = null;
    let customShopify: {customerPrivacy: CustomerPrivacy} | undefined | object =
      undefined;

    // monitor for when window.Shopify = {} is first set
    Object.defineProperty(window, 'Shopify', {
      configurable: true,
      get() {
        return customShopify;
      },
      set(value: unknown) {
        // monitor for when window.Shopify = {} is first set
        if (
          typeof value === 'object' &&
          value !== null &&
          Object.keys(value).length === 0
        ) {
          customShopify = value as object;

          // monitor for when window.Shopify.customerPrivacy is set
          Object.defineProperty(window.Shopify, 'customerPrivacy', {
            configurable: true,
            get() {
              return customCustomerPrivacy;
            },
            set(value: unknown) {
              if (
                typeof value === 'object' &&
                value !== null &&
                'setTrackingConsent' in value
              ) {
                const customerPrivacy = value as CustomerPrivacy;

                // overwrite the tracking consent method
                customCustomerPrivacy = {
                  ...customerPrivacy,
                  setTrackingConsent: overrideCustomerPrivacySetTrackingConsent(
                    {customerPrivacy, config},
                  ),
                };

                customShopify = {
                  ...customShopify,
                  customerPrivacy: customCustomerPrivacy,
                };

                setLoaded.customerPrivacy();
                emitCustomerPrivacyApiLoaded();
              }
            },
          });
        }
      },
    });
  }, [
    config,
    overrideCustomerPrivacySetTrackingConsent,
    setLoaded.customerPrivacy,
  ]);

  // return the customerPrivacy and privacyBanner (optional) modified APIs
  const result = {
    customerPrivacy: getCustomerPrivacy(),
  } as {
    customerPrivacy: CustomerPrivacy | null;
    privacyBanner?: PrivacyBanner | null;
  };

  if (withPrivacyBanner) {
    result.privacyBanner = getPrivacyBanner();
  }

  return result;
}

let hasEmitted = false;
function emitCustomerPrivacyApiLoaded() {
  if (hasEmitted) return;
  hasEmitted = true;
  const event = new CustomEvent('shopifyCustomerPrivacyApiLoaded');
  document.dispatchEvent(event);
}

function useApisLoaded({
  withPrivacyBanner,
  onLoaded,
}: {
  withPrivacyBanner: boolean;
  onLoaded?: () => void;
}) {
  // used to help run the watchers only once
  const observing = useRef({customerPrivacy: false, privacyBanner: false});

  // [customerPrivacy, privacyBanner]
  const [apisLoaded, setApisLoaded] = useState(
    withPrivacyBanner ? [false, false] : [false],
  );

  // combined loaded state for both APIs
  const loaded = apisLoaded.every(Boolean);

  const setLoaded = {
    customerPrivacy: () => {
      if (withPrivacyBanner) {
        setApisLoaded((prev) => [true, prev[1]]);
      } else {
        setApisLoaded(() => [true]);
      }
    },
    privacyBanner: () => {
      if (!withPrivacyBanner) {
        return;
      }
      setApisLoaded((prev) => [prev[0], true]);
    },
  };

  useEffect(() => {
    if (loaded && onLoaded) {
      // both APIs are loaded in the window
      onLoaded();
    }
  }, [loaded, onLoaded]);

  return {observing, setLoaded};
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

  return sameDomainParts.reverse().join('.');
}

/**
 * Overrides the customerPrivacy.setTrackingConsent method to include the headless storefront configuration.
 */
function overrideCustomerPrivacySetTrackingConsent({
  customerPrivacy,
  config,
}: {
  customerPrivacy: OriginalCustomerPrivacy;
  config: CustomerPrivacyConsentConfig;
}) {
  // Override the setTrackingConsent method to include the headless storefront configuration
  const original = customerPrivacy.setTrackingConsent;
  const {locale, country, ...rest} = config;

  function updatedSetTrackingConsent(
    consent: VisitorConsent,
    callback: (data: {error: string} | undefined) => void,
  ) {
    original(
      {
        ...rest,
        headlessStorefront: true,
        ...consent,
      },
      callback,
    );
  }
  return updatedSetTrackingConsent;
}

/**
 * Overrides the privacyBanner methods to include the config
 */
function overridePrivacyBannerMethods({
  privacyBanner,
  config,
}: {
  privacyBanner: PrivacyBanner;
  config: CustomerPrivacyConsentConfig;
}) {
  const originalLoadBanner = privacyBanner.loadBanner;
  const originalShowPreferences = privacyBanner.showPreferences;

  function loadBanner(userConfig?: Partial<CustomerPrivacyConsentConfig>) {
    if (typeof userConfig === 'object') {
      originalLoadBanner({...config, ...userConfig});
      return;
    }
    originalLoadBanner(config);
  }

  function showPreferences(userConfig?: Partial<CustomerPrivacyConsentConfig>) {
    if (typeof userConfig === 'object') {
      originalShowPreferences({...config, ...userConfig});
      return;
    }
    originalShowPreferences(config);
  }
  return {loadBanner, showPreferences} as PrivacyBanner;
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
