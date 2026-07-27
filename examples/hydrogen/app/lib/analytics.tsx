import {
  AnalyticsEvent,
  type AnalyticsCart,
  type AnalyticsCartLine,
  type CartData,
  type CartState,
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

/**
 * Convert dev-preview Hydrogen cart state into the current analytics cart payload.
 *
 * The core analytics bus still publishes Hydrogen-compatible cart payloads
 * (`updatedAt` plus connection-shaped `lines`) while we decide whether the
 * public analytics contract should become Hydrogen-native. Keep that
 * compatibility concern at this example boundary instead of changing cart
 * state to match analytics.
 */
type AnalyticsCartInput = CartData & Partial<Pick<CartState, "pending">>;

export function toAnalyticsCart(cart: AnalyticsCartInput): AnalyticsCart | null {
  if (!cart.id) return null;
  // Optimistic cart state can contain placeholder lines built from Standard
  // Events product detail before the server cart response arrives. Those lines
  // are useful for UI, but Shopify analytics requires complete GraphQL cart
  // line fields, so only publish analytics from settled cart state.
  if (hasPendingCartWork(cart)) return null;

  return {
    id: cart.id,
    updatedAt: new Date().toISOString(),
    cost: cart.cost,
    lines: {
      nodes: cart.lines.nodes.flatMap((line): AnalyticsCartLine[] => {
        const merchandise = line.merchandise;
        if (!merchandise) return [];

        const product = merchandise.product;
        const productId = typeof product.id === "string" ? product.id : "";
        const vendor = typeof product.vendor === "string" ? product.vendor : "";
        const productType =
          typeof product.productType === "string" ? product.productType : undefined;

        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title ?? product.title,
              price: line.cost.amountPerQuantity,
              sku: typeof merchandise.sku === "string" ? merchandise.sku : null,
              product: {
                id: productId,
                title: product.title,
                vendor,
                productType,
                handle: product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}

function hasPendingCartWork(cart: AnalyticsCartInput) {
  return Boolean(
    cart.pending &&
    (cart.pending.lines.size > 0 || cart.pending.note || cart.pending.discountCodes.size > 0),
  );
}
