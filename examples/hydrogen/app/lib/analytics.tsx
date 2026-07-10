import {
  AnalyticsEvent,
  type CollectionViewPayload,
  type ProductViewPayload,
  type SearchViewPayload,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

type AnalyticsContextValue = {
  bus: StorefrontAnalytics | null;
};

type PublishableAnalytics = {
  bus: StorefrontAnalytics;
  locationKey: string;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  bus: null,
});

export function HydrogenAnalyticsProvider({ children }: { children?: ReactNode }) {
  const [bus, setBus] = useState<StorefrontAnalytics | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const analyticsBus = window.Shopify?.analytics;
    if (!analyticsBus) {
      setError(
        new Error(
          "Shopify analytics bus is not available. Render <ShopifyScripts /> before rendering HydrogenAnalyticsProvider.",
        ),
      );
      return;
    }

    setBus(analyticsBus);

    return () => {
      setBus(null);
    };
  }, []);

  if (error) throw error;

  const contextValue = useMemo(
    () => ({
      bus,
    }),
    [bus],
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <PageAnalyticsSync />
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): PublishableAnalytics | null {
  const { bus } = useContext(AnalyticsContext);
  const { hash, pathname, search } = useLocation();
  const locationKey = `${pathname}${search}${hash}`;

  return useMemo(() => {
    if (!bus) return null;
    return { bus, locationKey };
  }, [bus, locationKey]);
}

function PageAnalyticsSync() {
  const analytics = useAnalytics();

  useEffect(() => {
    if (!analytics) return;

    analytics.bus.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [analytics]);

  return null;
}

export function CartAnalyticsSync() {
  useCartAnalytics();
  return null;
}

export function ProductView({ products }: Pick<ProductViewPayload, "products">) {
  const analytics = useAnalytics();

  useEffect(() => {
    if (!analytics) return;

    analytics.bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products,
    });
  }, [analytics, products]);

  return null;
}

export function CollectionView({ collection }: Pick<CollectionViewPayload, "collection">) {
  const analytics = useAnalytics();

  useEffect(() => {
    if (!analytics) return;

    analytics.bus.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection,
    });
  }, [analytics, collection]);

  return null;
}

export function SearchView({ searchResults, searchTerm }: Omit<SearchViewPayload, "shop" | "url">) {
  const analytics = useAnalytics();

  useEffect(() => {
    if (!analytics) return;

    analytics.bus.publish(AnalyticsEvent.SEARCH_VIEWED, {
      searchResults,
      searchTerm,
    });
  }, [analytics, searchResults, searchTerm]);

  return null;
}
