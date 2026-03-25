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
  publish: (event: string, payload: any) => void;
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
  register: (key: string) => {ready: () => void};
  updateCart: (cart: AnalyticsCart | null) => void;
  destroy: () => void;
  /** @internal */
  _internal: {
    updateShop: (shop: ShopAnalytics | null) => void;
    updateCustomData: (data: Record<string, unknown> | undefined) => void;
    getShop: () => ShopAnalytics | null;
    getCustomData: () => Record<string, unknown> | undefined;
    getPrevCart: () => AnalyticsCart | null;
    canTrack: () => boolean;
  };
};
