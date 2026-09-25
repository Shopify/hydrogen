import type { ShopifyScriptsShop } from "../shopify-scripts/types";
import type { AnalyticsEventName } from "./events";

// --- Shop Analytics ---

type ShopAnalyticsBase = Pick<ShopifyScriptsShop, "shopId">;

/** Discriminant for the analytics channel a storefront is running under. */
export type ShopAnalyticsChannel = "hydrogen" | "headless";

/**
 * Identifies the shop and channel for every analytics payload.
 *
 * The `"hydrogen"` variant carries the Hydrogen sales channel's `storefrontId`;
 * the `"headless"` variant omits it, because analytics for the Headless channel
 * isn't attributed to a specific storefront.
 */
export type ShopAnalytics =
  | (ShopAnalyticsBase & {
      /** The storefront is served by the Hydrogen sales channel. */
      channel: "hydrogen";
      /** Hydrogen storefront ID. Pass `"0"` when the app has no storefront ID. */
      storefrontId: ShopifyScriptsShop["storefrontId"];
    })
  | (ShopAnalyticsBase & {
      /** The storefront uses the Headless sales channel; analytics aren't tied to a storefront. */
      channel: "headless";
      storefrontId?: never;
    });

// --- Consent ---

export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

/**
 * Connects a consent provider once per analytics bus, after Shopify's consent API has loaded.
 * Use window.Shopify.customerPrivacy to synchronize consent.
 * Resolve only after the provider has a saved choice or the shopper interacts, and that
 * consent has been synchronized with Shopify. Hydrogen then checks consent and replays
 * allowed events. Rejection keeps delivery blocked. The integration stays active
 * across component unmounts.
 */
export type ConsentSetup = () => Promise<void>;

/**
 * Chooses which Shopify consent script `ShopifyScripts` loads and when the
 * analytics bus releases events to destinations.
 *
 * - `"default-banner"` loads Shopify's hosted privacy banner. If the visitor
 *   must see the banner, destinations wait until they accept or decline;
 *   otherwise events are released as soon as the consent API loads.
 * - `"custom-banner"` loads only the Customer Privacy API and requires a
 *   `setup` callback that integrates a third-party consent provider.
 *   Events release once the `setup` callback resolves.
 * - `"no-banner"` (or omitted) loads only the Customer Privacy API and
 *   releases events once it loads. If `window.privacyBanner` is present on the
 *   page anyway, events wait as they do for `"default-banner"`.
 *
 * In every mode, destinations only receive events while analytics processing is
 * allowed.
 */
export type ConsentConfig =
  | { mode?: "no-banner"; setup?: never }
  | { mode: "default-banner"; setup?: never }
  | { mode: "custom-banner"; setup: ConsentSetup };

// --- Cart types ---

/**
 * Lightweight cart line shape for analytics payloads.
 *
 * Mirrors the Storefront API `CartLine` fields needed for tracking without
 * depending on the cart store's `CartData` type, so the analytics bus stays
 * framework-agnostic.
 */
export type AnalyticsCartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    /**
     * Variant title (`"Default Title"` for single-variant products).
     * `trackCartAnalytics` falls back to the product title only when the cart
     * fragment doesn't select it.
     */
    title: string;
    /** Per-unit price (`CartLine.cost.amountPerQuantity`). */
    price: { amount: string; currencyCode?: string };
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

/**
 * Lightweight cart snapshot included in cart analytics payloads.
 *
 * Accepts both `nodes` and `edges` connection shapes so the analytics layer
 * works regardless of which Storefront API query pattern the storefront uses.
 */
export type AnalyticsCart = {
  id: string;
  /**
   * `Cart.updatedAt` (ISO 8601), used to deduplicate cart events. Add it to your
   * cart fragment if you haven't already — without it, the current time is used
   * instead.
   */
  updatedAt: string;
  cost?: {
    subtotalAmount?: { currencyCode?: string };
    totalAmount?: { currencyCode?: string };
  };
  /** Cart lines in Storefront API connection format. */
  lines: {
    nodes?: AnalyticsCartLine[];
    edges?: Array<{ node: AnalyticsCartLine }>;
  };
  [key: string]: unknown;
};

// --- Base Payloads ---

/** Index signature that allows arbitrary extra keys on a payload. */
export type OtherData = {
  [key: string]: unknown;
};

type BasePayload = {
  shop?: ShopAnalytics | null;
  customData?: Record<string, unknown>;
};

type UrlPayload = {
  url?: string;
};

/** Describes a single product for `product_viewed` payloads. */
export type ProductPayload = {
  id: string;
  title: string;
  /** Decimal amount string for the selected variant (e.g. `"19.99"`). */
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
  collection: { id: string; handle: string };
};

type SearchPayload = {
  searchTerm: string;
  searchResults?: unknown;
};

type CartPayload = {
  cart: AnalyticsCart | null;
};

type CartChangePayload = CartPayload & {
  prevCart: AnalyticsCart | null;
};

type CartLinePayload = {
  prevLine?: AnalyticsCartLine;
  currentLine?: AnalyticsCartLine;
};

// --- Event Payloads ---

/** Payload for `page_viewed` events. */
export type PageViewPayload = UrlPayload & BasePayload;
/** Payload for `product_viewed` events. */
export type ProductViewPayload = ProductsPayload & UrlPayload & BasePayload;
/** Payload for `collection_viewed` events. */
export type CollectionViewPayload = CollectionPayload & UrlPayload & BasePayload;
/** Payload for `cart_viewed` events. */
export type CartViewPayload = CartPayload & UrlPayload & BasePayload;
/** Payload for `search_viewed` events. */
export type SearchViewPayload = SearchPayload & UrlPayload & BasePayload;
/** Payload for `cart_updated` events. `prevCart` is `null` when there was no earlier snapshot. */
export type CartUpdatePayload = CartChangePayload & BasePayload & OtherData;
/**
 * Payload for `product_added_to_cart` and `product_removed_from_cart` events.
 * New lines have only `currentLine`, removed lines have only `prevLine`, and
 * quantity changes have both.
 */
export type CartLineUpdatePayload = CartLinePayload & CartChangePayload & BasePayload & OtherData;

export type EventPayloads =
  | PageViewPayload
  | ProductViewPayload
  | CollectionViewPayload
  | CartViewPayload
  | SearchViewPayload
  | CartUpdatePayload
  | CartLineUpdatePayload;

// --- Type-safe event mapping ---

/**
 * Maps each analytics event name to its payload type.
 *
 * TypeScript uses this to infer the correct payload when you call
 * `publish()` or a destination's `subscribe()` with a specific event name.
 */
export interface AnalyticsEventMap {
  page_viewed: PageViewPayload;
  product_viewed: ProductViewPayload;
  collection_viewed: CollectionViewPayload;
  cart_viewed: CartViewPayload;
  search_viewed: SearchViewPayload;
  cart_updated: CartUpdatePayload;
  product_added_to_cart: CartLineUpdatePayload;
  product_removed_from_cart: CartLineUpdatePayload;
}

/** Resolves the payload type for a supported analytics event name. */
export type PayloadFor<E extends AnalyticsEventName> = AnalyticsEventMap[E];

export type PublishPayloadArgs<E extends AnalyticsEventName> =
  {} extends PayloadFor<E> ? [payload?: PayloadFor<E>] : [payload: PayloadFor<E>];

// --- Bus Types ---

/**
 * Analytics bus configuration, built by `ShopifyScripts` from its `shop`,
 * `consent`, and `analytics` options.
 */
export type StorefrontAnalyticsConfig = {
  /** Shop identity and channel for analytics payloads. */
  shop: ShopAnalytics | null;
  /** Serializable consent settings. The provider setup callback stays in the client bundle. */
  consent: Pick<ConsentConfig, "mode">;
  /**
   * Extra key-value pairs accessible to destinations via `getConfig().customData`.
   * `publish()` doesn't merge them into payloads; only `trackCartAnalytics` copies
   * them into the cart payloads it publishes.
   */
  customData?: Record<string, unknown>;
};

/**
 * Visitor identifiers from Shopify's Customer Privacy API, used to correlate
 * analytics events. See `getTrackingValues` for when they are empty.
 */
export type AnalyticsTrackingValues = {
  /** Long-lived browser identifier; persists across visits. */
  uniqueToken: string;
  /** Session identifier (30-minute rolling expiry). */
  visitToken: string;
};

/** Context provided to destination callbacks alongside each event payload. */
export type StorefrontAnalyticsDestinationEventContext = {
  /**
   * Reads current tokens from the consent API. Returns empty strings when tokens are
   * unavailable or analytics tracking is not currently allowed.
   */
  getTrackingValues: () => AnalyticsTrackingValues;
};

/** Context passed into a destination's `setup()` function. */
export type StorefrontAnalyticsDestinationSetupContext = {
  /** Subscribe to an analytics event. Returns an unsubscribe function. */
  subscribe: <E extends AnalyticsEventName>(
    event: E,
    callback: (payload: PayloadFor<E>, context: StorefrontAnalyticsDestinationEventContext) => void,
  ) => () => void;
  /** Returns the current analytics bus configuration. */
  getConfig: () => StorefrontAnalyticsConfig;
};

/**
 * A consent-gated analytics integration that receives events after consent is granted.
 *
 * Destinations subscribe to events during `setup()` and receive live delivery
 * plus replayed buffered events once tracking is allowed. Return a cleanup
 * function from `setup()` to tear down side effects when the destination is
 * removed via the function returned by `addDestination()`. The bus itself lives
 * for the page's lifetime.
 */
export type StorefrontAnalyticsDestination = {
  /** Unique name for this destination — duplicates are rejected with a warning. */
  name: string;
  /**
   * Runs immediately when the destination is added, before consent is known, so
   * don't load third-party scripts or set cookies here. Subscribe via the context.
   * May be async: buffered events replay after it resolves (once tracking is
   * allowed). If it throws or rejects, the destination is removed.
   */
  setup: (
    context: StorefrontAnalyticsDestinationSetupContext,
  ) => void | (() => void) | Promise<void | (() => void)>;
};

/**
 * The framework-agnostic analytics event bus that `ShopifyScripts` exposes on
 * `window.Shopify.analytics`.
 *
 * Storefronts publish events (page views, product views, cart changes) via
 * `publish()`. Consent-gated tracking integrations register through
 * `addDestination()` and receive buffered events once consent is granted.
 */
export type StorefrontAnalytics = {
  /**
   * Emits an event to destinations while tracking is allowed. Otherwise the
   * event goes into a bounded replay buffer. Fills in `shop` and (for view
   * events) `url` when omitted.
   */
  publish: <E extends AnalyticsEventName>(event: E, ...payload: PublishPayloadArgs<E>) => void;
  /** Register a consent-gated destination integration. Returns a removal function. */
  addDestination: (destination: StorefrontAnalyticsDestination) => () => void;
  /** Returns the bus configuration; `shop.shopId` is normalized to a Shop GID. */
  getConfig: () => StorefrontAnalyticsConfig;
};
