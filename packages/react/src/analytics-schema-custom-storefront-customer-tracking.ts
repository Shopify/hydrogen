import {
  ShopifyAnalyticsPayload,
  ShopifyPageViewPayload,
  ShopifyAddToCartPayload,
  ShopifyMonorailPayload,
  ShopifyAnalyticsProduct,
  ShopifyMonorailEvent,
} from './analytics-types.js';
import {AnalyticsPageType, ShopifySalesChannel} from './analytics-constants.js';
import {addDataIf, schemaWrapper, parseGid} from './analytics-utils.js';
import {buildUUID} from './cookies-utils.js';

const SCHEMA_ID = 'custom_storefront_customer_tracking/1.0';
const PAGE_RENDERED_EVENT_NAME = 'page_rendered';
const COLLECTION_PAGE_RENDERED_EVENT_NAME = 'collection_page_rendered';
const PRODUCT_PAGE_RENDERED_EVENT_NAME = 'product_page_rendered';
const PRODUCT_ADDED_TO_CART_EVENT_NAME = 'product_added_to_cart';
const SEARCH_SUBMITTED_EVENT_NAME = 'search_submitted';

export function pageView(
  payload: ShopifyPageViewPayload
): ShopifyMonorailEvent[] {
  const pageViewPayload = payload;
  const additionalPayload = {
    canonical_url: pageViewPayload.canonicalUrl || pageViewPayload.url,
    customer_id: pageViewPayload.customerId,
  };
  const pageType = pageViewPayload.pageType;
  const pageViewEvents = [];

  pageViewEvents.push(
    schemaWrapper(
      SCHEMA_ID,
      addDataIf(
        {
          event_name: PAGE_RENDERED_EVENT_NAME,
          ...additionalPayload,
        },
        formatPayload(pageViewPayload)
      )
    )
  );

  switch (pageType) {
    case AnalyticsPageType.collection:
      pageViewEvents.push(
        schemaWrapper(
          SCHEMA_ID,
          addDataIf(
            {
              event_name: COLLECTION_PAGE_RENDERED_EVENT_NAME,
              ...additionalPayload,
              collection_name: pageViewPayload.collectionHandle,
            },
            formatPayload(pageViewPayload)
          )
        )
      );
      break;
    case AnalyticsPageType.product:
      pageViewEvents.push(
        schemaWrapper(
          SCHEMA_ID,
          addDataIf(
            {
              event_name: PRODUCT_PAGE_RENDERED_EVENT_NAME,
              ...additionalPayload,
              products: formatProductPayload(pageViewPayload.products),
              total_value: pageViewPayload.totalValue,
            },
            formatPayload(pageViewPayload)
          )
        )
      );
      break;
    case AnalyticsPageType.search:
      pageViewEvents.push(
        schemaWrapper(
          SCHEMA_ID,
          addDataIf(
            {
              event_name: SEARCH_SUBMITTED_EVENT_NAME,
              ...additionalPayload,
              search_string: pageViewPayload.searchString,
            },
            formatPayload(pageViewPayload)
          )
        )
      );
      break;
  }

  return pageViewEvents;
}

export function addToCart(
  payload: ShopifyAddToCartPayload
): ShopifyMonorailEvent[] {
  const addToCartPayload = payload;
  const cartToken = parseGid(addToCartPayload.cartId);
  const cart_token = cartToken?.id ? `${cartToken.id}` : null;
  return [
    schemaWrapper(
      SCHEMA_ID,
      addDataIf(
        {
          event_name: PRODUCT_ADDED_TO_CART_EVENT_NAME,
          customerId: addToCartPayload.customerId,
          cart_token,
          total_value: addToCartPayload.totalValue,
          products: formatProductPayload(addToCartPayload.products),
        },
        formatPayload(addToCartPayload)
      )
    ),
  ];
}

function formatPayload(
  payload: ShopifyAnalyticsPayload
): ShopifyMonorailPayload {
  return {
    source: payload.shopifySalesChannel || ShopifySalesChannel.headless,
    hydrogenSubchannelId: payload.storefrontId || '0',

    is_persistent_cookie: payload.hasUserConsent,
    ccpa_enforced: false,
    gdpr_enforced: false,
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
  };
}

function formatProductPayload(products?: ShopifyAnalyticsProduct[]): string[] {
  return products
    ? products.map((p: ShopifyAnalyticsProduct) => {
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
            price: p.price,
            quantity: Number(p.quantity || 0),
          }
        );
        return JSON.stringify(product);
      })
    : [];
}
