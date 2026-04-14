import type {AnalyticsEvent} from './events';

// --- Shop Analytics ---

export type ShopAnalytics = {
  shopId: string;
  acceptedLanguage: string;
  currency: string;
  hydrogenSubchannelId: string | '0';
};

// --- Consent ---

export type ConsentConfig = {
  checkoutDomain?: string;
  sameDomainForStorefrontApi?: boolean;
  storefrontAccessToken?: string;
  withPrivacyBanner?: boolean;
  country?: string;
  language?: string;
};

export type ConsentCollectedPayload = {
  trackingValuesChanged: boolean;
};

// --- Cart types (lightweight, no dependency on hydrogen's CartReturn) ---

export type AnalyticsCartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: {amount: string; currencyCode?: string};
    sku?: string | null;
    product: {
      id: string;
      title: string;
      vendor: string;
      productType?: string;
      handle?: string;
    };
  };
};

export type AnalyticsCart = {
  id: string;
  updatedAt: string;
  lines: {
    nodes?: AnalyticsCartLine[];
    edges?: Array<{node: AnalyticsCartLine}>;
  };
  [key: string]: unknown;
};

// --- Base Payloads ---

export type OtherData = {
  [key: string]: unknown;
};

type BasePayload = {
  shop: ShopAnalytics | null;
  customData?: Record<string, unknown>;
};

type UrlPayload = {
  url: string;
};

export type ProductPayload = {
  id: string;
  title: string;
  price: string;
  vendor: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
  sku?: string | null;
  productType?: string;
};

type ProductsPayload = {
  products: Array<ProductPayload & OtherData>;
};

type CollectionPayload = {
  collection: {id: string; handle: string};
};

type SearchPayload = {
  searchTerm: string;
  searchResults?: unknown;
};

type CartPayload = {
  cart: AnalyticsCart | null;
  prevCart: AnalyticsCart | null;
};

type CartLinePayload = {
  prevLine?: AnalyticsCartLine;
  currentLine?: AnalyticsCartLine;
};

// --- Event Payloads ---

export type PageViewPayload = UrlPayload & BasePayload;
export type ProductViewPayload = ProductsPayload & UrlPayload & BasePayload;
export type CollectionViewPayload = CollectionPayload &
  UrlPayload &
  BasePayload;
export type CartViewPayload = CartPayload & UrlPayload & BasePayload;
export type SearchViewPayload = SearchPayload & UrlPayload & BasePayload;
export type CartUpdatePayload = CartPayload & BasePayload & OtherData;
export type CartLineUpdatePayload = CartLinePayload &
  CartPayload &
  BasePayload &
  OtherData;
export type CustomEventPayload = BasePayload & OtherData;

export type EventPayloads =
  | PageViewPayload
  | ProductViewPayload
  | CollectionViewPayload
  | CartViewPayload
  | SearchViewPayload
  | CartUpdatePayload
  | CartLineUpdatePayload
  | CustomEventPayload
  | ConsentCollectedPayload;

// --- Type-safe event mapping ---

export interface AnalyticsEventMap {
  page_viewed: PageViewPayload;
  product_viewed: ProductViewPayload;
  collection_viewed: CollectionViewPayload;
  cart_viewed: CartViewPayload;
  search_viewed: SearchViewPayload;
  cart_updated: CartUpdatePayload;
  product_added_to_cart: CartLineUpdatePayload;
  product_removed_from_cart: CartLineUpdatePayload;
  '_internal:consent_collected': ConsentCollectedPayload;
}

/**
 * Resolves the payload type for a given event name.
 * Known events map to their specific payload type; custom events
 * (`custom_*`) map to CustomEventPayload; unknown events fall back
 * to Record<string, unknown>.
 */
export type PayloadFor<E extends string> = E extends keyof AnalyticsEventMap
  ? AnalyticsEventMap[E]
  : E extends `custom_${string}`
    ? CustomEventPayload
    : Record<string, unknown>;

// --- Bus Types ---

export type AnalyticsBusOptions = {
  shop: ShopAnalytics | null;
  consent: ConsentConfig;
  canTrack?: () => boolean;
  customData?: Record<string, unknown>;
  cookieDomain?: string;
  /**
   * Whether to auto-initialize internal subscribers (consent, Monorail dispatch, PerfKit).
   * Set to false in tests where these browser-dependent systems can't initialize.
   * @default true
   */
  autoInit?: boolean;
};

export type AnalyticsBus = {
  publish: <E extends string>(event: E, payload: PayloadFor<E>) => void;
  subscribe: <E extends string>(
    event: E,
    callback: (payload: PayloadFor<E>) => void,
  ) => () => void;
  register: (key: string) => {ready: () => void};
  updateCart: (cart: AnalyticsCart | null) => void;
  destroy: () => void;
  /**
   * @internal — Framework adapter API. NOT part of the public contract.
   *
   * Framework wrappers (React, Vue, etc.) need to push state updates
   * that originate from framework-specific lifecycle events (e.g. async
   * shop data resolution, custom data changes). These methods are the
   * bridge between framework state and the framework-agnostic bus.
   */
  _internal: {
    updateShop: (shop: ShopAnalytics | null) => void;
    updateCustomData: (data: Record<string, unknown> | undefined) => void;
    getShop: () => ShopAnalytics | null;
    getCustomData: () => Record<string, unknown> | undefined;
    getPrevCart: () => AnalyticsCart | null;
    canTrack: () => boolean;
  };
};