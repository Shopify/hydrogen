import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type AnalyticsCart,
  type AnalyticsCartLine,
  type CartData,
  type CartState,
  type CollectionViewPayload,
  type ConsentConfig,
  type ProductViewPayload,
  type SearchViewPayload,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useLocation } from "react-router";

import { useCart } from "~/lib/cart";

declare global {
  interface Window {
    __HYDROGEN_E2E_CONSENT_MODE__?: ConsentConfig["mode"];
  }
}

type MaybePromise<T> = T | Promise<T>;

type AnalyticsContextValue = {
  bus: StorefrontAnalytics | null;
  shop: ShopAnalytics | null;
  carts: AnalyticsCarts;
  setCarts: Dispatch<SetStateAction<AnalyticsCarts>>;
};

type PublishableAnalytics = {
  bus: StorefrontAnalytics;
  locationKey: string;
};

type AnalyticsCarts = {
  cart: AnalyticsCart | null;
  prevCart: AnalyticsCart | null;
};

const EMPTY_CARTS: AnalyticsCarts = { cart: null, prevCart: null };

const AnalyticsContext = createContext<AnalyticsContextValue>({
  bus: null,
  shop: null,
  carts: EMPTY_CARTS,
  setCarts: () => {},
});

export function HydrogenAnalyticsProvider({
  children,
  consent,
  shop,
}: {
  children?: ReactNode;
  consent: ConsentConfig;
  shop: MaybePromise<ShopAnalytics | null>;
}) {
  const [value, setValue] = useState<Pick<AnalyticsContextValue, "bus" | "shop">>({
    bus: null,
    shop: null,
  });
  const [carts, setCarts] = useState<AnalyticsCarts>(EMPTY_CARTS);
  const { consentDomain, mode, publicStorefrontAccessToken } = consent;
  const e2eConsentMode =
    typeof window === "undefined" ? undefined : window.__HYDROGEN_E2E_CONSENT_MODE__;
  const consentConfig = useMemo(
    () => ({
      consentDomain,
      mode: e2eConsentMode ?? mode,
      publicStorefrontAccessToken,
    }),
    [consentDomain, e2eConsentMode, mode, publicStorefrontAccessToken],
  );

  useEffect(() => {
    let active = true;
    let currentBus: StorefrontAnalytics | null = null;

    Promise.resolve(shop).then((resolvedShop) => {
      if (!active) return;

      currentBus = createStorefrontAnalytics({ shop: resolvedShop, consent: consentConfig });
      setValue({ bus: currentBus, shop: resolvedShop });
    });

    return () => {
      active = false;
      currentBus?.destroy();
      setValue({ bus: null, shop: null });
      setCarts(EMPTY_CARTS);
    };
  }, [consentConfig, shop]);

  const contextValue = useMemo(
    () => ({
      ...value,
      carts,
      setCarts,
    }),
    [carts, value],
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <PageAnalyticsSync />
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): PublishableAnalytics | null {
  const { bus, shop } = useContext(AnalyticsContext);
  const { hash, pathname, search } = useLocation();
  const locationKey = `${pathname}${search}${hash}`;

  return useMemo(() => {
    if (!bus || !shop) return null;
    return { bus, locationKey };
  }, [bus, locationKey, shop]);
}

export function useAnalyticsCarts(): AnalyticsCarts {
  return useContext(AnalyticsContext).carts;
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
  const { bus, setCarts } = useContext(AnalyticsContext);
  const cart = useCart((state) => state);
  const analyticsCart = useMemo(
    () => toAnalyticsCart({ ...cart.data, pending: cart.pending }),
    [cart],
  );

  useEffect(() => {
    if (!analyticsCart) return;

    setCarts(({ cart, prevCart }) =>
      analyticsCart.updatedAt !== cart?.updatedAt
        ? { cart: analyticsCart, prevCart: cart }
        : { cart, prevCart },
    );
    bus?.updateCart(analyticsCart);
  }, [analyticsCart, bus, setCarts]);

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
