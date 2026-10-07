import type { MoneyV2 } from "../../graphql/generated/storefront-api-types";
import type { ShopifyScriptsShop } from "../shopify-scripts/types";
import type { AnalyticsEventName } from "./events";

// --- Shop Analytics ---

/** The shop ID that every analytics payload carries. */
type ShopAnalyticsBase = Pick<ShopifyScriptsShop, "shopId">;

/** The sales channel that Shopify attributes a storefront's analytics to. */
export type ShopAnalyticsChannel = "hydrogen" | "headless";

/**
 * Identifies the shop and sales channel in every analytics payload.
 *
 * The `"hydrogen"` channel carries the storefront ID. The `"headless"` channel
 * omits the storefront ID.
 *
 * @publicDocs
 */
export type ShopAnalytics = HydrogenShopAnalytics | HeadlessShopAnalytics;

/** The shop and storefront for a storefront on the Hydrogen sales channel. */
interface HydrogenShopAnalytics extends ShopAnalyticsBase {
  /** The Hydrogen sales channel serves the storefront. */
  channel: "hydrogen";
  /** The Hydrogen storefront's ID. */
  storefrontId: ShopifyScriptsShop["storefrontId"];
}

/** The shop for a storefront on the Headless sales channel. */
interface HeadlessShopAnalytics extends ShopAnalyticsBase {
  /** The Headless sales channel serves the storefront. */
  channel: "headless";
  storefrontId?: never;
}

// --- Consent ---

/**
 * The consent choices that a custom consent setup passes to
 * `window.Shopify.customerPrivacy.setTrackingConsent()`.
 *
 * @publicDocs
 */
export type ConsentPreferences = {
  /** Whether the customer allows analytics tracking. */
  analytics: boolean;
  /** Whether the customer allows marketing tracking. */
  marketing: boolean;
  /** Whether the customer allows the storefront to remember their preferences. */
  preferences: boolean;
  /** Whether the customer allows the sale or sharing of their data. */
  sale_of_data: boolean;
};

/**
 * Connects a third-party consent provider to Shopify's Customer Privacy API. Hydrogen calls the
 * function once, after the Customer Privacy API loads. Pass the provider's choice to
 * `window.Shopify.customerPrivacy`, and resolve after Shopify receives the choice. Hydrogen then
 * delivers the events that consent allows. When the promise rejects, Hydrogen logs the error,
 * keeps events blocked, and doesn't call the function again.
 */
export type ConsentSetup =
  /**
   * @returns A promise that resolves after consent syncs with Shopify, or rejects to keep delivery blocked.
   */
  () => Promise<void>;

/**
 * Chooses which Shopify consent script loads and when the analytics bus
 * releases events to destinations.
 *
 * - `"default-banner"` loads Shopify's hosted privacy banner. When the customer
 *   must see the banner, destinations wait until the customer accepts or
 *   declines. Otherwise, events release as soon as the consent API loads.
 * - `"custom-banner"` loads only the Customer Privacy API and requires a
 *   `setup` callback that integrates a third-party consent provider.
 *   Events release once the callback resolves.
 * - `"no-banner"` loads only the Customer Privacy API and releases events
 *   once the API loads. Omitting the mode has the same effect.
 *
 * In every mode, destinations receive events only while the Customer Privacy
 * API allows analytics processing.
 */
export type ConsentConfig =
  | { mode?: "no-banner"; setup?: never }
  | { mode: "default-banner"; setup?: never }
  | { mode: "custom-banner"; setup: ConsentSetup };

// --- Cart types ---

/** A cart line in an analytics payload, with the Storefront API fields that cart tracking reads. */
export type AnalyticsCartLine = {
  /** The cart line ID. */
  id: string;
  /** The number of units on the line. */
  quantity: number;
  /** The variant on the line, with its product. */
  merchandise: {
    /** The variant ID. */
    id: string;
    /**
     * The variant title, which is `"Default Title"` for single-variant products.
     * Cart tracking uses the product title when the cart fragment doesn't select
     * the variant title.
     */
    title: string;
    /** The price of one unit, from the cart line's cost per quantity. */
    price: { amount: string; currencyCode?: string };
    /** The variant's SKU. Cart tracking sets `null` when the variant has no SKU. */
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
 * A cart snapshot in cart analytics payloads.
 *
 * @publicDocs
 */
export type AnalyticsCart = {
  /** The cart ID. */
  id: string;
  /**
   * The time of the cart's last update, as an ISO 8601 string.
   */
  updatedAt: string;
  /** The currency codes of the cart's subtotal and total. */
  cost?: {
    subtotalAmount?: { currencyCode?: string };
    totalAmount?: { currencyCode?: string };
  };
  /** The cart lines, as a `nodes` list or an `edges` list. Cart tracking fills `nodes`. */
  lines: {
    nodes?: AnalyticsCartLine[];
    edges?: Array<{ node: AnalyticsCartLine }>;
  };
  [key: string]: unknown;
};

// --- Base Payloads ---

/**
 * Extra keys that a payload can carry. Cart tracking adds `eventTimestamp`, the publish time
 * in milliseconds.
 *
 * @publicDocs
 */
export type OtherData = {
  [key: string]: unknown;
};

type BasePayload = {
  /**
   * The shop and sales channel. The bus fills in the configured shop when the payload omits
   * the key, and normalizes the shop ID to a Shop GID.
   */
  shop?: ShopAnalytics | null;
  /** Custom values for destinations. Cart tracking copies the bus configuration's custom data here. */
  customData?: Record<string, unknown>;
};

type UrlPayload = {
  /** The page URL. For view events, the bus fills in the current URL when the payload omits it. */
  url?: string;
};

/**
 * A product in a product view payload.
 *
 * @publicDocs
 */
export type ProductPayload = {
  /** The product ID. */
  id: string;
  /** The product title. */
  title: string;
  /** The selected variant's price. */
  price: MoneyV2;
  /** The product vendor. */
  vendor: string;
  /** The selected variant's ID. */
  variantId: string;
  /** The selected variant's title. */
  variantTitle: string;
  /** The selected quantity. */
  quantity: number;
  /** The selected variant's SKU, or `null` when the variant has none. */
  sku?: string | null;
  /** The product type. */
  productType?: string;
};

type ProductsPayload = {
  /** The products that the customer views. */
  products: Array<ProductPayload & OtherData>;
};

type CollectionPayload = {
  /** The ID and handle of the collection that the customer views. */
  collection: { id: string; handle: string };
};

type SearchPayload = {
  /** The customer's search query. */
  searchTerm: string;
  /** The search results, in any shape that your destinations read. */
  searchResults?: unknown;
};

type CartPayload = {
  /** The current cart. */
  cart: AnalyticsCart | null;
};

interface CartChangePayload extends CartPayload {
  /** The cart before the change, or `null` when cart tracking has no earlier snapshot. */
  prevCart: AnalyticsCart | null;
}

type CartLinePayload = {
  /** The line before the change. */
  prevLine?: AnalyticsCartLine;
  /** The line after the change. */
  currentLine?: AnalyticsCartLine;
};

// --- Event Payloads ---

/**
 * The data for a `page_viewed` event. The payload has only the fields that every view event shares.
 *
 * @publicDocs
 */
export type PageViewPayload = UrlPayload & BasePayload;
/**
 * The data for a `product_viewed` event. The payload lists the products that the customer views.
 *
 * @publicDocs
 */
export type ProductViewPayload = ProductsPayload & UrlPayload & BasePayload;
/**
 * The data for a `collection_viewed` event. The payload has the ID and handle of the collection that the customer views.
 *
 * @publicDocs
 */
export type CollectionViewPayload = CollectionPayload & UrlPayload & BasePayload;
/**
 * The data for a `cart_viewed` event. The payload has the current cart.
 *
 * @publicDocs
 */
export type CartViewPayload = CartPayload & UrlPayload & BasePayload;
/**
 * The data for a `search_viewed` event. The payload has the customer's search term and optional search results in any shape that your destinations read.
 *
 * @publicDocs
 */
export type SearchViewPayload = SearchPayload & UrlPayload & BasePayload;
/**
 * The data for a `cart_updated` event. Cart tracking sends the current cart, the cart before the change, the shop, the custom data from the bus configuration, and the publish time. The previous cart is `null` when cart tracking has no earlier snapshot.
 *
 * @publicDocs
 */
export type CartUpdatePayload = CartChangePayload & BasePayload & OtherData;
/**
 * The data for `product_added_to_cart` and `product_removed_from_cart` events. The payload has the same fields as a cart update, plus the line before and after the change.
 * New lines have only the current line, removed lines have only the previous
 * line, and quantity changes have both.
 *
 * @publicDocs
 */
export type CartLineUpdatePayload = CartLinePayload & CartChangePayload & BasePayload & OtherData;

// --- Type-safe event mapping ---

/**
 * Maps each analytics event name to its payload type.
 *
 * TypeScript uses the map to infer the payload when you publish an event or
 * subscribe a destination to a specific event name.
 *
 * @publicDocs
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

/**
 * Resolves the payload type for a supported analytics event name.
 *
 * @publicDocs
 */
export type PayloadFor<E extends AnalyticsEventName> = AnalyticsEventMap[E];

/** The payload argument for publishing an event. It's optional when every payload field is optional. */
export type PublishPayloadArgs<E extends AnalyticsEventName> =
  {} extends PayloadFor<E> ? [payload?: PayloadFor<E>] : [payload: PayloadFor<E>];

// --- Bus Types ---

/**
 * The analytics bus configuration. Hydrogen builds it from the shop, consent, and analytics
 * options of the Shopify script tags.
 *
 * @publicDocs
 */
export type StorefrontAnalyticsConfig = {
  /** The shop and sales channel for analytics payloads. */
  shop: ShopAnalytics | null;
  /** The consent mode, without the setup callback. */
  consent: Pick<ConsentConfig, "mode">;
  /**
   * Extra key-value pairs that destinations read from the bus configuration. Cart tracking
   * copies them into cart event payloads. The bus doesn't add them to events that you publish.
   */
  customData?: Record<string, unknown>;
};

/**
 * Visitor identifiers from Shopify's Customer Privacy API. Destinations use them to correlate
 * analytics events. Both identifiers are empty strings when the values are unavailable.
 *
 * @publicDocs
 */
export type AnalyticsTrackingValues = {
  /** The browser's unique visitor identifier. */
  uniqueToken: string;
  /** The session identifier. */
  visitToken: string;
};

/**
 * The context that a destination callback receives with each event payload.
 *
 * @publicDocs
 */
export type StorefrontAnalyticsDestinationEventContext = {
  /**
   * Returns the current visitor tokens from the Customer Privacy API. The function checks consent
   * on every call, and returns empty strings when the tokens are unavailable or consent blocks tracking.
   */
  getTrackingValues: () => AnalyticsTrackingValues;
};

/**
 * The context that a destination's setup function receives.
 *
 * @publicDocs
 */
export type StorefrontAnalyticsDestinationSetupContext = {
  /**
   * Subscribes a callback to an analytics event and returns a function that unsubscribes it.
   * The bus warns and ignores unsupported event names.
   */
  subscribe: <E extends AnalyticsEventName>(
    event: E,
    callback: (payload: PayloadFor<E>, context: StorefrontAnalyticsDestinationEventContext) => void,
  ) => () => void;
  /** Returns the current analytics bus configuration. */
  getConfig: () => StorefrontAnalyticsConfig;
};

/**
 * An analytics integration that receives events once consent allows tracking.
 *
 * Subscribe to events in the setup function. After consent allows tracking, the destination
 * receives the earlier events from the buffer and then new events. Return a cleanup function
 * from setup to undo side effects when you remove the destination.
 *
 * @publicDocs
 */
export type StorefrontAnalyticsDestination = {
  /** A unique name. The bus warns and ignores a destination that reuses the name of an active destination. */
  name: string;
  /**
   * Runs as soon as you add the destination, which can happen before the customer consents.
   * Subscribe to events through the context. Don't load third-party scripts or set cookies in
   * setup. The function can be async. The bus replays buffered events after setup resolves and
   * consent allows tracking. When setup throws or rejects, the bus logs the error and removes
   * the destination.
   */
  setup: (
    context: StorefrontAnalyticsDestinationSetupContext,
  ) => void | (() => void) | Promise<void | (() => void)>;
};

/**
 * The analytics event bus that the Shopify script tags create at `window.Shopify.analytics`.
 *
 * Storefronts publish events such as page views, product views, and cart changes. Tracking
 * integrations register as destinations and receive events once consent allows tracking.
 *
 * @publicDocs
 */
export type StorefrontAnalytics = {
  /**
   * Publishes an event. The bus delivers the event to destinations while consent allows
   * tracking, and records the event in a replay buffer for destinations that you add later.
   * The buffer keeps the latest 500 events. When consent completes without allowing tracking,
   * the bus clears the buffer and stops recording until consent allows tracking.
   *
   * The bus fills in the shop when the payload omits it, and the current URL for view events.
   * The bus warns and drops events with unsupported names.
   */
  publish: <E extends AnalyticsEventName>(event: E, ...payload: PublishPayloadArgs<E>) => void;
  /** Adds a destination and returns a function that removes it. Removing a destination runs its cleanup function. */
  addDestination: (destination: StorefrontAnalyticsDestination) => () => void;
  /** Returns the bus configuration, with the shop ID normalized to a Shop GID. */
  getConfig: () => StorefrontAnalyticsConfig;
};
