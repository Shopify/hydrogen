import {getTrackingValues} from '@shopify/hydrogen-react';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useRevalidator} from 'react-router';
import {loadScript} from '@shopify/hydrogen-react/load-script';

export type ConsentStatus = boolean | undefined;

export type VisitorConsent = {
  marketing: ConsentStatus;
  analytics: ConsentStatus;
  preferences: ConsentStatus;
  sale_of_data: ConsentStatus;
};

/** Consent choices returned by the Customer Privacy API. */
export type VisitorConsentValues = Record<
  keyof VisitorConsent,
  'yes' | 'no' | ''
>;

type CustomerPrivacyConfiguration = {
  isHeadless?: boolean;
  asyncConsent?: boolean;
  asyncVisitorState?: boolean;
  consentDomain?: string;
  storefrontAccessToken?: string;
  injectedConsent?: string;
  debug?: {
    hydrogen?: {generation: number; serverTiming: boolean};
    [key: string]: unknown;
  };
};

export type VisitorConsentCollected = {
  analyticsAllowed: boolean;
  firstPartyMarketingAllowed: boolean;
  marketingAllowed: boolean;
  preferencesAllowed: boolean;
  saleOfDataAllowed: boolean;
  thirdPartyMarketingAllowed: boolean;
};

export type CustomerPrivacyConsentConfig = {
  checkoutRootDomain: string;
  storefrontRootDomain?: string;
  storefrontAccessToken: string;
  country?: CountryCode;
  /** The privacyBanner refers to `language` as `locale`  */
  locale?: LanguageCode;
};

export type SetConsentHeadlessParams = Partial<VisitorConsent> &
  CustomerPrivacyConsentConfig & {
    headlessStorefront?: boolean;
  };

/**
  Ideally this type should come from the Customer Privacy API sdk
  analyticsProcessingAllowed -
  currentVisitorConsent
  doesMerchantSupportGranularConsent
  firstPartyMarketingAllowed
  getCCPAConsent
  getTrackingConsent
  marketingAllowed
  preferencesProcessingAllowed
  saleOfDataAllowed
  saleOfDataRegion
  setTrackingConsent
  shouldShowBanner
  shouldShowGDPRBanner
  thirdPartyMarketingAllowed
**/
export type OriginalCustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsentValues;
  consentStatus?: 'loading' | 'loaded';
  config?: CustomerPrivacyConfiguration;
  preferencesProcessingAllowed: () => boolean;
  saleOfDataAllowed: () => boolean;
  marketingAllowed: () => boolean;
  analyticsProcessingAllowed: () => boolean;
  setTrackingConsent: (
    consent: SetConsentHeadlessParams,
    callback: (data: {error: string} | undefined) => void,
  ) => void;
  shouldShowBanner: () => boolean;
};

export type CustomerPrivacy = Omit<
  OriginalCustomerPrivacy,
  'setTrackingConsent'
> & {
  setTrackingConsent: (
    consent: Partial<VisitorConsent>, // we have already applied the headlessStorefront in the override
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
  consentTrackingApiLoaded: Event;
  shopifyCustomerPrivacyApiLoaded: CustomEvent<null>;
}

export type CustomerPrivacyApiProps = {
  /** The production shop checkout domain url.  */
  checkoutDomain: string;
  /** The storefront access token for the shop. */
  storefrontAccessToken: string;
  /** Whether to load the Shopify privacy banner as configured in Shopify admin. Defaults to false. */
  withPrivacyBanner?: boolean;
  /** Country code for the shop. */
  country?: CountryCode;
  /** Language code for the shop. */
  locale?: LanguageCode;
  /** Callback to be called when visitor consent is collected. */
  onVisitorConsentCollected?: (consent: VisitorConsentCollected) => void;
  /**
   * Called once consent is available and the selected APIs are loaded. If initial
   * consent fails to load, waits for a successful consent update. The returned
   * customerPrivacy API may be available earlier, for example to show a custom CMP.
   */
  onReady?: () => void;
  /**
   * Whether consent libraries can use same-domain requests to the Storefront API.
   * Defaults to true because Hydrogen's standard request handler includes the proxy.
   * Set to false only when using a custom server without that proxy.
   */
  sameDomainForStorefrontApi?: boolean;
};

export const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js';
export const CONSENT_API_WITH_BANNER =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

function logMissingConfig(fieldName: string) {
  // eslint-disable-next-line no-console
  console.error(
    `[h2:error:useCustomerPrivacy] Unable to setup Customer Privacy API: Missing consent.${fieldName} configuration.`,
  );
}

/** @publicDocs */
export function useCustomerPrivacy(props: CustomerPrivacyApiProps) {
  const {
    withPrivacyBanner = false,
    onVisitorConsentCollected,
    onReady,
    checkoutDomain,
    storefrontAccessToken,
    country,
    locale,
    sameDomainForStorefrontApi,
  } = props;
  const {revalidate} = useRevalidator();
  const callbacks = useRef({onReady, onVisitorConsentCollected, revalidate});
  callbacks.current = {onReady, onVisitorConsentCollected, revalidate};
  const notifiedReady = useRef(false);
  const previousTrackingValues = useRef<ReturnType<typeof getTrackingValues>>();
  const [apis, setApis] = useState(() => ({
    customerPrivacy: getCustomerPrivacy(),
    privacyBanner: getPrivacyBanner(),
  }));

  const config = useMemo<CustomerPrivacyConsentConfig>(() => {
    if (!checkoutDomain) logMissingConfig('checkoutDomain');
    if (!storefrontAccessToken) logMissingConfig('storefrontAccessToken');

    if (
      storefrontAccessToken.startsWith('shpat_') ||
      storefrontAccessToken.length !== 32
    ) {
      console.error(
        `[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token`,
      );
    }

    const commonAncestorDomain = parseStoreDomain(checkoutDomain);
    return {
      checkoutRootDomain:
        sameDomainForStorefrontApi !== false && typeof window !== 'undefined'
          ? window.location.host
          : checkoutDomain,
      storefrontRootDomain: commonAncestorDomain
        ? '.' + commonAncestorDomain
        : undefined,
      storefrontAccessToken,
      country,
      locale,
    };
  }, [
    sameDomainForStorefrontApi,
    checkoutDomain,
    storefrontAccessToken,
    country,
    locale,
  ]);

  useEffect(() => {
    let active = true;

    // Both CDN bundles read this configuration while evaluating their modules.
    // Install it before loading either script, preserving any existing API,
    // consent, tokens, or unrelated Shopify configuration.
    const shopify = (window.Shopify ??= {});
    const privacy = (shopify.customerPrivacy ??= {});
    privacy.config = {
      ...privacy.config,
      isHeadless: true,
      asyncConsent: true,
      asyncVisitorState: true,
      consentDomain: config.checkoutRootDomain,
      storefrontAccessToken: config.storefrontAccessToken,
      debug: {
        ...privacy.config?.debug,
        hydrogen: HYDROGEN_DEBUG_METADATA,
      },
    };
    if (config.country) shopify.country = config.country;
    if (config.locale) shopify.locale = config.locale.toLowerCase();

    const updateTrackingValues = () => {
      const latest = getTrackingValues();
      const previous = previousTrackingValues.current;
      previousTrackingValues.current = latest;
      if (
        previous &&
        (previous.visitToken !== latest.visitToken ||
          previous.uniqueToken !== latest.uniqueToken)
      ) {
        // Later token changes can affect cart checkout URL parameters.
        callbacks.current.revalidate().catch(() => {
          console.warn(
            '[h2:warn:useCustomerPrivacy] Revalidation failed after consent change.',
          );
        });
      }
    };

    const checkReady = () => {
      if (!active) return false;
      const customerPrivacy = getCustomerPrivacy();
      const privacyBanner = getPrivacyBanner();

      // Keep the public Hydrogen helpers configured, without copying the API:
      // CTA owns the consent/token cache on this same object.
      if (customerPrivacy) configureCustomerPrivacy(customerPrivacy, config);
      if (withPrivacyBanner && privacyBanner) {
        configurePrivacyBanner(privacyBanner, config);
      }
      setApis((previous) =>
        previous.customerPrivacy === customerPrivacy &&
        previous.privacyBanner === privacyBanner
          ? previous
          : {customerPrivacy, privacyBanner},
      );

      if (
        customerPrivacy?.consentStatus !== 'loaded' ||
        (withPrivacyBanner && !privacyBanner)
      ) {
        return false;
      }

      if (!notifiedReady.current) {
        notifiedReady.current = true;
        updateTrackingValues();
        emitCustomerPrivacyApiLoaded(customerPrivacy);
        callbacks.current.onReady?.();
      }
      return true;
    };

    const consentCollectedHandler = (
      event: CustomEvent<VisitorConsentCollected>,
    ) => {
      // A successful user update can also recover from failed initialization.
      if (!checkReady()) return;
      updateTrackingValues();
      callbacks.current.onVisitorConsentCollected?.(event.detail);
    };

    document.addEventListener('consentTrackingApiLoaded', checkReady);
    document.addEventListener(
      'visitorConsentCollected',
      consentCollectedHandler,
    );

    // Catch APIs that were already initialized before this component mounted.
    // An older API without consentStatus still needs the selected bundle to run.
    if (!checkReady()) {
      void loadScript(
        withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API,
        {
          attributes: {id: 'customer-privacy-api'},
        },
      ).then(checkReady, () => {
        if (active) {
          console.error(
            '[h2:error:useCustomerPrivacy] Unable to load the Customer Privacy API.',
          );
        }
      });
    }

    // PB auto-loads with isHeadless: true. Its ready event can precede the
    // privacyBanner global assignment, so script completion also checks readiness.
    return () => {
      active = false;
      document.removeEventListener('consentTrackingApiLoaded', checkReady);
      document.removeEventListener(
        'visitorConsentCollected',
        consentCollectedHandler,
      );
    };
  }, [config, withPrivacyBanner]);

  return {
    customerPrivacy: apis.customerPrivacy,
    ...(withPrivacyBanner ? {privacyBanner: apis.privacyBanner} : {}),
  };
}

const readyApis = new WeakSet<CustomerPrivacy>();
function emitCustomerPrivacyApiLoaded(customerPrivacy: CustomerPrivacy) {
  if (readyApis.has(customerPrivacy)) return;
  readyApis.add(customerPrivacy);
  document.dispatchEvent(new CustomEvent('shopifyCustomerPrivacyApiLoaded'));
}

// CTA/PB currently infer generation from asyncConsent. Keep this metadata so
// their instrumentation can distinguish classic once that detection is updated.
const HYDROGEN_DEBUG_METADATA = {generation: 2, serverTiming: false} as const;

// Preserve the API object and install each wrapper once, even across remounts.
// Updating the mutable config also keeps country/locale changes current.
const configuredCustomerPrivacy = new WeakMap<
  CustomerPrivacy,
  {config: CustomerPrivacyConsentConfig}
>();
function configureCustomerPrivacy(
  customerPrivacy: CustomerPrivacy,
  config: CustomerPrivacyConsentConfig,
) {
  const existing = configuredCustomerPrivacy.get(customerPrivacy);
  if (existing) {
    existing.config = config;
    return;
  }
  const state = {config};
  configuredCustomerPrivacy.set(customerPrivacy, state);
  const original =
    customerPrivacy.setTrackingConsent as OriginalCustomerPrivacy['setTrackingConsent'];
  customerPrivacy.setTrackingConsent = (consent, callback) => {
    const {locale, country, ...headlessConfig} = state.config;
    original.call(
      customerPrivacy,
      {...headlessConfig, headlessStorefront: true, ...consent},
      callback,
    );
  };
}

const configuredPrivacyBanners = new WeakMap<
  PrivacyBanner,
  {config: CustomerPrivacyConsentConfig}
>();
function configurePrivacyBanner(
  privacyBanner: PrivacyBanner,
  config: CustomerPrivacyConsentConfig,
) {
  const existing = configuredPrivacyBanners.get(privacyBanner);
  if (existing) {
    existing.config = config;
    return;
  }
  const state = {config};
  configuredPrivacyBanners.set(privacyBanner, state);
  const {loadBanner, showPreferences} = privacyBanner;
  privacyBanner.loadBanner = (options) =>
    loadBanner.call(privacyBanner, {...state.config, ...options});
  privacyBanner.showPreferences = (options) =>
    showPreferences.call(privacyBanner, {...state.config, ...options});
}

/**
 * Extracts the root domain from the checkout domain otherwise returns the checkout domain.
 */
function parseStoreDomain(checkoutDomain: string) {
  if (typeof window === 'undefined') return;

  const host = window.location.host;
  const checkoutDomainParts = checkoutDomain.split('.').reverse();
  const currentDomainParts = host.split('.').reverse();
  const sameDomainParts: Array<string> = [];
  checkoutDomainParts.forEach((part, index) => {
    if (part === currentDomainParts[index]) {
      sameDomainParts.push(part);
    }
  });

  return sameDomainParts.reverse().join('.') || undefined;
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
    const cp = window.Shopify?.customerPrivacy;
    // Only return the API when the consent library has fully loaded —
    // the initial config object is not the usable API.
    return typeof cp?.setTrackingConsent === 'function'
      ? (cp as CustomerPrivacy)
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
    const banner = window.privacyBanner;
    return typeof banner?.loadBanner === 'function' &&
      typeof banner.showPreferences === 'function'
      ? banner
      : null;
  } catch (e) {
    return null;
  }
}
