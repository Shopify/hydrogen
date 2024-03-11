import { type ReactNode, useMemo, useCallback, createContext, useContext, useRef } from "react";
import { AnalyticsView } from "./AnalyticsView";

type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
  canTrack?: () => boolean;
  // TODO: what does this do?
  staticPayload?: Record<string, unknown>;
}

type AnalyticsContextValue = {
  canTrack?: AnalyticsProviderProps['canTrack'];
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  canTrack: () => false,
  publish: () => { },
  subscribe: () => { },
};

const AnalyticsContext = createContext<AnalyticsContextValue>(
  defaultAnalyticsContext,
);

// TODO: These should be imported from the Consent component
export type VisitorConsentCollected = {
  analyticsAllowed: boolean;
  firstPartyMarketingAllowed: boolean;
  marketingAllowed: boolean;
  preferencesAllowed: boolean;
  saleOfDataAllowed: boolean;
  thirdPartyMarketingAllowed: boolean;
};

// TODO: These should be imported from the Consent component
type CustomerPrivacyConsentConfig = {
  checkoutRootDomain?: string;
  storefrontRootDomain?: string;
  storefrontAccessToken?: string;
};

// TODO: These should be imported from the Consent component
type SetConsentHeadlessParams = VisitorConsent &
  CustomerPrivacyConsentConfig & {
    headlessStorefront?: boolean;
  };

// TODO: These should be imported from the Consent component
export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  userCanBeTracked: () => boolean;
  setTrackingConsent: (
    consent: SetConsentHeadlessParams,
    callback: () => void,
  ) => void;
};

// TODO: These should be imported from the Consent component
type PrivacyBanner = {
  loadBanner: (options: CustomerPrivacyConsentConfig) => void;
};

// TODO: These should be imported from the Consent component
type ConsentStatus = 'true' | 'false' | '';

// TODO: These should be imported from the Consent component
export type VisitorConsent = {
  marketing: ConsentStatus;
  analytics: ConsentStatus;
  preferences: ConsentStatus;
  sale_of_data: ConsentStatus;
};

// TODO: These should be imported from the Consent component
declare global {
  interface Window {
    privacyBanner: PrivacyBanner;
    Shopify: {
      customerPrivacy: CustomerPrivacy;
    };
  }
}

const subscribers = new Map<string, Map<String, (payload: Record<string, unknown>) => void>>();
const eventsHoldQueue = Array<{ event: string, payload: Record<string, unknown> }>();

export function AnalyticsProvider({
  children,
  canTrack: customCanTrack,
  staticPayload = {},
}: AnalyticsProviderProps): JSX.Element {
  const shopifyCanTrack = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window?.Shopify === 'object' &&
      typeof window?.Shopify?.customerPrivacy === 'object' &&
      typeof window?.Shopify?.customerPrivacy?.userCanBeTracked === 'function'
    ) {
      return window.Shopify.customerPrivacy.userCanBeTracked();
    }
    return false;
  }, []);

  const canTrack = customCanTrack ?? shopifyCanTrack ?? (() => false);
  const value = useMemo<AnalyticsContextValue>(() => {
    return {
      canTrack,
      publish: (event: string, payload: Record<string, unknown>) => {
        const stampedPayload = {
          eventTimestamp: Date.now(),
          ...staticPayload,
          ...payload
        };
        if (typeof canTrack === 'function' && canTrack()) {
          (subscribers.get(event) ?? new Map()).forEach((callback) => {
            try {
              callback(stampedPayload);
            } catch (error) {
              console.error(error);
            }
          });
        }
      },
      subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => {
        if (!subscribers.has(event)) {
          subscribers.set(event, new Map());
        }
        subscribers.get(event)?.set(callback.toString(), callback);
      },
    };
  }, [staticPayload, canTrack]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      <AnalyticsView eventName={AnalyticsView.PAGE_VIEWED} />
    </AnalyticsContext.Provider>
  );
};

export function useAnalyticsProvider(): AnalyticsContextValue {
  const analyticsContext = useContext(AnalyticsContext);
  if (!analyticsContext) {
    throw new Error(`'useAnalyticsProvider()' must be a descendent of <AnalyticsProvider/>`);
  }
  return analyticsContext;
}
