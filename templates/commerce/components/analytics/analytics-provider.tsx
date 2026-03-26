'use client';

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {
  createAnalyticsBus,
  AnalyticsEvent,
  type AnalyticsBus,
  type ShopAnalytics,
  type ConsentConfig,
} from '@shopify/hydrogen-temp';

type AnalyticsContextType = {
  bus: AnalyticsBus;
  shop: ShopAnalytics | null;
};

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalyticsBus() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsBus must be used within an AnalyticsProvider');
  }
  return context;
}

type AnalyticsProviderProps = {
  children: ReactNode;
  shop: Promise<ShopAnalytics | null> | ShopAnalytics | null;
  consent: ConsentConfig;
};

/**
 * Client-side analytics provider that creates and manages the analytics bus.
 *
 * Publishes `page_viewed` on URL changes with ref-based deduplication.
 * Cart tracking is handled by CartAnalyticsTracker (a sibling component
 * that bridges the commerce template's flat CartItem[] to AnalyticsCart).
 *
 * Note: The bus's internal `SCRIPTS_LOADED` cache (for consent + PerfKit scripts)
 * survives `bus.destroy()`. During HMR, a full page reload may be required
 * for analytics scripts to re-initialize.
 */
export function AnalyticsProvider({
  children,
  shop: shopProp,
  consent,
}: AnalyticsProviderProps) {
  const [shop, setShop] = useState<ShopAnalytics | null>(null);
  const shopResolved = useRef(false);

  const busRef = useRef<AnalyticsBus | null>(null);
  if (!busRef.current) {
    busRef.current = createAnalyticsBus({
      shop: null,
      consent,
      canTrack: () => {
        try {
          return (window as any).Shopify?.customerPrivacy?.analyticsProcessingAllowed() ?? false;
        } catch {
          return false;
        }
      },
    });
  }
  const bus = busRef.current;

  // Resolve async shop prop once (shopProp is a new Promise ref on every
  // server render, so we use a flag to avoid re-resolution on navigation).
  // The flag is set inside .then() so a rejected promise doesn't permanently
  // block resolution on retry.
  useEffect(() => {
    if (shopResolved.current) return;

    Promise.resolve(shopProp)
      .then((resolved) => {
        shopResolved.current = true;
        setShop(resolved);
        bus._internal.updateShop(resolved);
      })
      .catch(() => {
        console.warn('[analytics] Failed to resolve shop analytics data');
      });
  }, [shopProp, bus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bus.destroy();
    };
  }, [bus]);

  return (
    <AnalyticsContext.Provider value={{bus, shop}}>
      {children}
      {/* URL tracking lives in a separate component so useSearchParams
          suspension doesn't blank the entire page */}
      <Suspense fallback={null}>
        <AnalyticsUrlTracker bus={bus} shop={shop} />
      </Suspense>
    </AnalyticsContext.Provider>
  );
}

/**
 * Isolated component for URL change tracking. Uses useSearchParams() which
 * can suspend in Next.js App Router — by keeping this separate from the main
 * provider, suspension only affects this invisible component, not the children.
 */
function AnalyticsUrlTracker({
  bus,
  shop,
}: {
  bus: AnalyticsBus;
  shop: ShopAnalytics | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams}` : '');
  const lastPublishedUrl = useRef('');

  useEffect(() => {
    if (!shop?.shopId) return;
    if (currentUrl === lastPublishedUrl.current) return;

    lastPublishedUrl.current = currentUrl;

    bus.publish(AnalyticsEvent.PAGE_VIEWED, {
      shop,
      url: window.location.href,
      customData: {},
    });
  }, [currentUrl, shop?.shopId, bus]);

  return null;
}
