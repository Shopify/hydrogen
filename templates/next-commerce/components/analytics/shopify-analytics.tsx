'use client';

import {
  AnalyticsEventName,
  AnalyticsPageType,
  ShopifySalesChannel,
  getClientBrowserParameters,
  getTrackingValues,
  sendShopifyAnalytics,
  type ShopifyAnalyticsProduct,
  type ShopifyPageViewPayload,
  useShopifyCookies,
} from '@shopify/hydrogen-react';
import type {
  Collection,
  Product,
  ProductVariant,
  ShopAnalytics,
} from 'lib/shopify/types';
import {usePathname, useSearchParams} from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

type AnalyticsContextValue = {
  ready: boolean;
  trackPageView: (payload?: Partial<ShopifyPageViewPayload>) => void;
  trackProductView: (product: Product, variant: ProductVariant) => void;
  trackCollectionView: (collection: Collection) => void;
  trackSearchView: (searchTerm?: string) => void;
  trackAddToCart: (
    product: AnalyticsProductInput,
    variant: ProductVariant,
    quantity?: number,
    cartId?: string,
  ) => void;
};

type AnalyticsProductInput = Pick<
  Product,
  'id' | 'title' | 'vendor' | 'productType'
>;

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(
  undefined,
);

function hasAnalyticsConsent() {
  const {uniqueToken, visitToken} = getTrackingValues();

  return Boolean(
    uniqueToken &&
    visitToken &&
    !uniqueToken.startsWith('00000000-') &&
    !visitToken.startsWith('00000000-'),
  );
}

function getBasePayload(shop: ShopAnalytics) {
  return {
    ...getClientBrowserParameters(),
    ...shop,
    hasUserConsent: hasAnalyticsConsent(),
    shopifySalesChannel: ShopifySalesChannel.headless,
  };
}

function getAnalyticsProduct(
  product: AnalyticsProductInput,
  variant: ProductVariant,
  quantity = 1,
): ShopifyAnalyticsProduct {
  return {
    productGid: product.id,
    variantGid: variant.id,
    name: product.title,
    variantName: variant.title,
    brand: product.vendor,
    category: product.productType || undefined,
    price: variant.price.amount,
    quantity,
    sku: variant.sku,
  };
}

function getCartIdFromCookie() {
  const match = document.cookie.match(/(?:^|; )cartId=([^;]+)/);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function getSelectedVariant(product: Product, searchParams: URLSearchParams) {
  return (
    product.variants.find((variant) =>
      variant.selectedOptions.every(
        (option) =>
          option.value === searchParams.get(option.name.toLowerCase()),
      ),
    ) || product.variants[0]
  );
}

export function ShopifyAnalyticsProvider({
  children,
  shop,
}: {
  children: React.ReactNode;
  shop: ShopAnalytics;
}) {
  const ready = useShopifyCookies({
    fetchTrackingValues: true,
    hasUserConsent: true,
  });

  const trackPageView = useCallback(
    (payload: Partial<ShopifyPageViewPayload> = {}) => {
      if (!ready) return;

      const basePayload = getBasePayload(shop);
      if (!basePayload.hasUserConsent) return;

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.PAGE_VIEW_2,
        payload: {...basePayload, ...payload},
      });
    },
    [ready, shop],
  );

  const trackProductView = useCallback(
    (product: Product, variant: ProductVariant) => {
      if (!ready) return;

      const basePayload = getBasePayload(shop);
      if (!basePayload.hasUserConsent) return;

      const analyticsProduct = getAnalyticsProduct(product, variant);

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.PRODUCT_VIEW,
        payload: {
          ...basePayload,
          pageType: AnalyticsPageType.product,
          products: [analyticsProduct],
          resourceId: product.id,
          totalValue: Number(analyticsProduct.price),
        },
      });

      trackPageView({
        pageType: AnalyticsPageType.product,
        resourceId: product.id,
      });
    },
    [ready, shop, trackPageView],
  );

  const trackCollectionView = useCallback(
    (collection: Collection) => {
      if (!ready) return;

      const basePayload = getBasePayload(shop);
      if (!basePayload.hasUserConsent) return;

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.COLLECTION_VIEW,
        payload: {
          ...basePayload,
          collectionHandle: collection.handle,
          collectionId: collection.id,
          pageType: AnalyticsPageType.collection,
          resourceId: collection.id,
        },
      });

      trackPageView({
        collectionHandle: collection.handle,
        collectionId: collection.id,
        pageType: AnalyticsPageType.collection,
        resourceId: collection.id,
      });
    },
    [ready, shop, trackPageView],
  );

  const trackSearchView = useCallback(
    (searchTerm?: string) => {
      if (!ready) return;

      const basePayload = getBasePayload(shop);
      if (!basePayload.hasUserConsent) return;

      if (searchTerm) {
        sendShopifyAnalytics({
          eventName: AnalyticsEventName.SEARCH_VIEW,
          payload: {
            ...basePayload,
            pageType: AnalyticsPageType.search,
            searchString: searchTerm,
          },
        });
      }

      trackPageView({
        pageType: AnalyticsPageType.search,
        searchString: searchTerm,
      });
    },
    [ready, shop, trackPageView],
  );

  const trackAddToCart = useCallback(
    (
      product: AnalyticsProductInput,
      variant: ProductVariant,
      quantity = 1,
      cartId?: string,
    ) => {
      if (!ready) return;

      const resolvedCartId = cartId || getCartIdFromCookie();
      if (!resolvedCartId) return;

      const basePayload = getBasePayload(shop);
      if (!basePayload.hasUserConsent) return;

      const analyticsProduct = getAnalyticsProduct(product, variant, quantity);

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.ADD_TO_CART,
        payload: {
          ...basePayload,
          cartId: resolvedCartId,
          products: [analyticsProduct],
          totalValue: Number(analyticsProduct.price) * quantity,
        },
      });
    },
    [ready, shop],
  );

  const value = useMemo(
    () => ({
      ready,
      trackPageView,
      trackProductView,
      trackCollectionView,
      trackSearchView,
      trackAddToCart,
    }),
    [
      ready,
      trackPageView,
      trackProductView,
      trackCollectionView,
      trackSearchView,
      trackAddToCart,
    ],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useStorefrontAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error(
      'Analytics components must be used within ShopifyAnalyticsProvider',
    );
  }

  return context;
}

export function AnalyticsPageView({
  collectionHandle,
  collectionId,
  pageType,
  resourceId,
  searchString,
}: Partial<ShopifyPageViewPayload>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {ready, trackPageView} = useStorefrontAnalytics();
  const search = searchParams.toString();

  useEffect(() => {
    if (!ready) return;

    trackPageView({
      collectionHandle,
      collectionId,
      pageType,
      resourceId,
      searchString,
    });
  }, [
    collectionHandle,
    collectionId,
    pageType,
    pathname,
    ready,
    resourceId,
    search,
    searchString,
    trackPageView,
  ]);

  return null;
}

export function AnalyticsProductView({product}: {product: Product}) {
  const pathname = usePathname();
  const nextSearchParams = useSearchParams();
  const {ready, trackProductView} = useStorefrontAnalytics();
  const search = nextSearchParams.toString();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const variant = useMemo(
    () => getSelectedVariant(product, searchParams),
    [product, searchParams],
  );

  useEffect(() => {
    if (!ready || !variant) return;

    trackProductView(product, variant);
  }, [pathname, product, ready, search, trackProductView, variant]);

  return null;
}

export function AnalyticsCollectionView({
  collection,
}: {
  collection: Collection;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {ready, trackCollectionView} = useStorefrontAnalytics();
  const search = searchParams.toString();

  useEffect(() => {
    if (!ready) return;

    trackCollectionView(collection);
  }, [collection, pathname, ready, search, trackCollectionView]);

  return null;
}

export function AnalyticsSearchView({searchTerm}: {searchTerm?: string}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {ready, trackSearchView} = useStorefrontAnalytics();
  const search = searchParams.toString();

  useEffect(() => {
    if (!ready) return;

    trackSearchView(searchTerm);
  }, [pathname, ready, search, searchTerm, trackSearchView]);

  return null;
}
