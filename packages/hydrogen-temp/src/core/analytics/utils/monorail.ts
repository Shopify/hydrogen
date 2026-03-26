/**
 * Inlined from @shopify/hydrogen-react analytics modules.
 * Handles Monorail event dispatch and schema transformations.
 *
 * Two schemas:
 * - trekkie_storefront_page_view/1.4 — page view tracking
 * - custom_storefront_customer_tracking/1.2 — rich e-commerce events
 */

import {parseGid} from './parse-gid';
import {buildUUID} from './uuid';
import type {ClientBrowserParameters} from './browser-params';

// --- Constants ---

export const MonorailEventName = {
  PAGE_VIEW: 'PAGE_VIEW',
  ADD_TO_CART: 'ADD_TO_CART',
  PAGE_VIEW_2: 'PAGE_VIEW_2',
  COLLECTION_VIEW: 'COLLECTION_VIEW',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  SEARCH_VIEW: 'SEARCH_VIEW',
} as const;

export const PageType = {
  article: 'article',
  blog: 'blog',
  cart: 'cart',
  collection: 'collection',
  home: 'index',
  page: 'page',
  product: 'product',
  search: 'search',
} as const;

const ShopifyAppId = {
  hydrogen: '6167201',
  headless: '12875497473',
} as const;

const OXYGEN_DOMAIN = 'myshopify.dev';

// --- Types ---

export type ShopifyAnalyticsProduct = {
  productGid: string;
  variantGid?: string;
  name: string;
  variantName?: string;
  brand: string;
  category?: string;
  price: string;
  sku?: string | null;
  quantity?: number;
};

export type MonorailPayload = {
  products?: string[];
  [key: string]: unknown;
};

type MonorailEvent = {
  schema_id: string;
  payload: MonorailPayload;
  metadata: {event_created_at_ms: number};
};

export interface PageViewPayload extends ClientBrowserParameters {
  hasUserConsent: boolean;
  shopId: string;
  currency: string;
  storefrontId?: string;
  hydrogenSubchannelId?: string;
  acceptedLanguage?: string;
  shopifySalesChannel?: string;
  assetVersionId?: string;
  customerId?: string;
  totalValue?: number;
  products?: ShopifyAnalyticsProduct[];
  canonicalUrl?: string;
  pageType?: string;
  resourceId?: string;
  collectionHandle?: string;
  collectionId?: string;
  searchString?: string;
  analyticsAllowed?: boolean;
  marketingAllowed?: boolean;
  saleOfDataAllowed?: boolean;
  ccpaEnforced?: boolean;
  gdprEnforced?: boolean;
}

export interface AddToCartPayload extends PageViewPayload {
  cartId: string;
}

export type ShopifyAnalyticsEvent =
  | {eventName: string; payload: PageViewPayload}
  | {eventName: string; payload: AddToCartPayload};

// --- Schema Helpers ---

function schemaWrapper(
  schemaId: string,
  payload: MonorailPayload,
): MonorailEvent {
  return {
    schema_id: schemaId,
    payload,
    metadata: {event_created_at_ms: Date.now()},
  };
}

function addDataIf(
  keyValuePairs: MonorailPayload,
  formattedData: MonorailPayload,
): MonorailPayload {
  if (typeof keyValuePairs !== 'object') return {};
  Object.entries(keyValuePairs).forEach(([key, value]) => {
    if (value) formattedData[key] = value;
  });
  return formattedData;
}

function isMerchantRequest(url: string): boolean {
  if (typeof url !== 'string') return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname.indexOf(OXYGEN_DOMAIN) !== -1 || hostname === 'localhost';
  } catch {
    return false;
  }
}

function formatProductPayload(products?: ShopifyAnalyticsProduct[]): string[] {
  return products
    ? products.map((p) => {
        const product = addDataIf(
          {
            variant_gid: p.variantGid,
            category: p.category,
            sku: p.sku,
            product_id: parseInt(parseGid(p.productGid).id),
            variant_id: parseInt(parseGid(p.variantGid).id),
          },
          {
            product_gid: p.productGid,
            name: p.name,
            variant: p.variantName || '',
            brand: p.brand,
            price: parseFloat(p.price),
            quantity: Number(p.quantity || 0),
          },
        );
        return JSON.stringify(product);
      })
    : [];
}

// --- Trekkie Schema (trekkie_storefront_page_view/1.4) ---

const TREKKIE_SCHEMA_ID = 'trekkie_storefront_page_view/1.4';

function trekkiePageView(payload: PageViewPayload): MonorailEvent[] {
  const {id, resource} = parseGid(payload.resourceId);
  const resourceType = resource ? resource.toLowerCase() : undefined;
  return [
    schemaWrapper(
      TREKKIE_SCHEMA_ID,
      addDataIf(
        {
          pageType: payload.pageType,
          customerId: parseInt(parseGid(payload.customerId).id || '0'),
          resourceType,
          resourceId: parseInt(id),
        },
        {
          appClientId: payload.shopifySalesChannel
            ? ShopifyAppId[
                payload.shopifySalesChannel as keyof typeof ShopifyAppId
              ]
            : ShopifyAppId.headless,
          isMerchantRequest: isMerchantRequest(payload.url),
          hydrogenSubchannelId:
            payload.storefrontId || payload.hydrogenSubchannelId || '0',
          isPersistentCookie: payload.hasUserConsent,
          uniqToken: payload.uniqueToken,
          visitToken: payload.visitToken,
          microSessionId: buildUUID(),
          microSessionCount: 1,
          url: payload.url,
          path: payload.path,
          search: payload.search,
          referrer: payload.referrer,
          title: payload.title,
          shopId: parseInt(parseGid(payload.shopId).id),
          currency: payload.currency,
          contentLanguage: payload.acceptedLanguage || 'en',
        },
      ),
    ),
  ];
}

// --- Customer Tracking Schema (custom_storefront_customer_tracking/1.2) ---

const CUSTOMER_SCHEMA_ID = 'custom_storefront_customer_tracking/1.2';

function customerFormatPayload(payload: PageViewPayload): MonorailPayload {
  return {
    source: payload.shopifySalesChannel || 'headless',
    asset_version_id: payload.assetVersionId || '0.0.0',
    hydrogenSubchannelId:
      payload.storefrontId || payload.hydrogenSubchannelId || '0',
    is_persistent_cookie: payload.hasUserConsent,
    deprecated_visit_token: payload.visitToken,
    unique_token: payload.uniqueToken,
    event_time: Date.now(),
    event_id: buildUUID(),
    event_source_url: payload.url,
    referrer: payload.referrer,
    user_agent: payload.userAgent,
    navigation_type: payload.navigationType,
    navigation_api: payload.navigationApi,
    shop_id: parseInt(parseGid(payload.shopId).id),
    currency: payload.currency,
    ccpa_enforced: payload.ccpaEnforced || false,
    gdpr_enforced: payload.gdprEnforced || false,
    gdpr_enforced_as_string: payload.gdprEnforced ? 'true' : 'false',
    analytics_allowed: payload.analyticsAllowed || false,
    marketing_allowed: payload.marketingAllowed || false,
    sale_of_data_allowed: payload.saleOfDataAllowed || false,
  };
}

function customerPageView2(payload: PageViewPayload): MonorailEvent[] {
  return [
    schemaWrapper(
      CUSTOMER_SCHEMA_ID,
      addDataIf(
        {
          event_name: 'page_rendered',
          canonical_url: payload.canonicalUrl || payload.url,
          customer_id: parseInt(parseGid(payload.customerId).id || '0'),
        },
        customerFormatPayload(payload),
      ),
    ),
  ];
}

function customerCollectionView(payload: PageViewPayload): MonorailEvent[] {
  return [
    schemaWrapper(
      CUSTOMER_SCHEMA_ID,
      addDataIf(
        {
          event_name: 'collection_page_rendered',
          canonical_url: payload.canonicalUrl || payload.url,
          customer_id: parseInt(parseGid(payload.customerId).id || '0'),
          collection_name: payload.collectionHandle,
          collection_id: parseInt(parseGid(payload.collectionId).id),
        },
        customerFormatPayload(payload),
      ),
    ),
  ];
}

function customerProductView(payload: PageViewPayload): MonorailEvent[] {
  return [
    schemaWrapper(
      CUSTOMER_SCHEMA_ID,
      addDataIf(
        {
          event_name: 'product_page_rendered',
          canonical_url: payload.canonicalUrl || payload.url,
          customer_id: parseInt(parseGid(payload.customerId).id || '0'),
          products: formatProductPayload(payload.products),
          total_value: payload.totalValue,
        },
        customerFormatPayload(payload),
      ),
    ),
  ];
}

function customerSearchView(payload: PageViewPayload): MonorailEvent[] {
  return [
    schemaWrapper(
      CUSTOMER_SCHEMA_ID,
      addDataIf(
        {
          event_name: 'search_submitted',
          canonical_url: payload.canonicalUrl || payload.url,
          customer_id: parseInt(parseGid(payload.customerId).id || '0'),
          search_string: payload.searchString,
        },
        customerFormatPayload(payload),
      ),
    ),
  ];
}

function customerAddToCart(payload: AddToCartPayload): MonorailEvent[] {
  const cartToken = parseGid(payload.cartId);
  return [
    schemaWrapper(
      CUSTOMER_SCHEMA_ID,
      addDataIf(
        {
          event_name: 'product_added_to_cart',
          customerId: payload.customerId,
          cart_token: cartToken?.id ? `${cartToken.id}` : null,
          total_value: payload.totalValue,
          products: formatProductPayload(payload.products),
          customer_id: parseInt(parseGid(payload.customerId).id || '0'),
        },
        customerFormatPayload(payload),
      ),
    ),
  ];
}

// --- Public API ---

function isLighthouseUserAgent(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  return /Chrome-Lighthouse/.test(window.navigator.userAgent);
}

async function sendToShopify(
  events: MonorailEvent[],
  shopDomain?: string,
): Promise<void> {
  if (isLighthouseUserAgent()) return Promise.resolve();

  const body = JSON.stringify({
    events,
    metadata: {event_sent_at_ms: Date.now()},
  });

  try {
    const url = shopDomain
      ? `https://${shopDomain}/.well-known/shopify/monorail/unstable/produce_batch`
      : 'https://monorail-edge.shopifysvc.com/unstable/produce_batch';

    return fetch(url, {
      method: 'post',
      headers: {'content-type': 'text/plain'},
      body,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Response failed');
        return response.text();
      })
      .then((data) => {
        if (data) {
          const jsonResponse = JSON.parse(data);
          jsonResponse.result.forEach(
            (eventResponse: {status: number; message: string}) => {
              if (eventResponse.status !== 200) {
                console.error(
                  'sendShopifyAnalytics request is unsuccessful',
                  eventResponse.message,
                );
              }
            },
          );
        }
      })
      .catch((err) => {
        console.error('sendShopifyAnalytics request is unsuccessful', err);
      });
  } catch {
    return Promise.resolve();
  }
}

/**
 * Sends analytics events to Shopify Monorail.
 * Dispatches to the appropriate schema(s) based on event name.
 */
export function sendShopifyAnalytics(
  event: ShopifyAnalyticsEvent,
  shopDomain?: string,
): Promise<void> {
  const {eventName, payload} = event;
  if (!payload.hasUserConsent) return Promise.resolve();

  let events: MonorailEvent[] = [];

  if (eventName === MonorailEventName.PAGE_VIEW_2) {
    events = events.concat(
      trekkiePageView(payload),
      customerPageView2(payload),
    );
  } else if (eventName === MonorailEventName.ADD_TO_CART) {
    events = events.concat(customerAddToCart(payload as AddToCartPayload));
  } else if (eventName === MonorailEventName.COLLECTION_VIEW) {
    events = events.concat(customerCollectionView(payload));
  } else if (eventName === MonorailEventName.PRODUCT_VIEW) {
    events = events.concat(customerProductView(payload));
  } else if (eventName === MonorailEventName.SEARCH_VIEW) {
    events = events.concat(customerSearchView(payload));
  }

  if (events.length) {
    return sendToShopify(events, shopDomain);
  }
  return Promise.resolve();
}
