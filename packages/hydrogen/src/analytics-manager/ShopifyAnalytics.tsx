import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
  type ShopifyPageViewPayload,
  AnalyticsPageType,
  type ShopifyAnalyticsProduct,
  type ShopifyAddToCartPayload,
} from '@shopify/hydrogen-react';
import {type CartReturn} from '../cart/queries/cart-types';
import {AnalyticsEvent} from './events';
import {useAnalytics, type AnalyticsProviderProps} from './AnalyticsProvider';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
} from '../customer-privacy/ShopifyCustomerPrivacy';
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  CartUpdatePayload,
  CartLineUpdatePayload,
  SearchViewPayload,
} from './AnalyticsView';
import {useEffect, useState} from 'react';
import {
  CartLine,
  ComponentizableCartLine,
  Maybe,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {errorOnce} from '../utils/warning';

function getCustomerPrivacyRequired() {
  const customerPrivacy = getCustomerPrivacy();

  if (!customerPrivacy) {
    throw new Error(
      'Shopify Customer Privacy API not available. Must be used within a useEffect. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacy() or <AnalyticsProvider>.',
    );
  }

  return customerPrivacy;
}

function messageOnError(field: string) {
  return `[h2:error:Analytics.Provider] - ${field} is required`;
}


/**
 * This component is responsible for sending analytics events to Shopify.
 * It emits the following events:
 * - page_viewed
 * - product_viewed
 * - collection_viewed
 * - search_viewed
 * - product_added_to_cart
 */
export function ShopifyAnalytics({
  consent,
  onReady,
  domain,
  disableThrowOnError,
  isMockShop
}: {
  consent: AnalyticsProviderProps['consent'];
  onReady: () => void;
  domain?: string;
  disableThrowOnError: boolean;
  isMockShop: boolean;
}) {

  // If mock shop is used, log error instead of throwing
  if (isMockShop) {
    errorOnce('[h2:error:Analytics.Provider] - Mock shop is used. Analytics will not work properly.')
  } else {
    if (!consent.checkoutDomain) {
      const errorMsg = messageOnError('consent.checkoutDomain');
      if (disableThrowOnError) {
        // eslint-disable-next-line no-console
        console.error(errorMsg);
      } else {
        invariant(false, errorMsg);
      }
    }

    if (!consent.storefrontAccessToken) {
      const errorMsg = messageOnError('consent.storefrontAccessToken');
      if (disableThrowOnError) {
        // eslint-disable-next-line no-console
        console.error(errorMsg);
      } else {
        invariant(false, errorMsg);
      }
    }
  }

  const {subscribe, register, canTrack} = useAnalytics();
  const [shopifyReady, setShopifyReady] = useState(false);
  const [privacyReady, setPrivacyReady] = useState(false);
  const {ready: shopifyAnalyticsReady} = register('Internal_Shopify_Analytics');
  const {ready: customerPrivacyReady} = register(
    'Internal_Shopify_CustomerPrivacy',
  );
  const analyticsReady = () => {
    shopifyReady && privacyReady && onReady();
  };

  const setCustomerPrivacyReady = () => {
    setPrivacyReady(true);
    customerPrivacyReady();
    analyticsReady();
  };

  useCustomerPrivacy({
    checkoutDomain: isMockShop ? 'mock.shop' : consent.checkoutDomain,
    storefrontAccessToken: isMockShop ? 'abcdefghijklmnopqrstuvwxyz123456' :consent.storefrontAccessToken,
    onVisitorConsentCollected: setCustomerPrivacyReady,
    onReady: () => {
      // Set customer privacy ready 3 seconds after load
      setTimeout(setCustomerPrivacyReady, 3000);
    },
  });

  useShopifyCookies({
    hasUserConsent: canTrack(),
    domain,
  });

  useEffect(() => {
    // Views
    subscribe(AnalyticsEvent.PAGE_VIEWED, pageViewHandler);
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, productViewHandler);
    subscribe(AnalyticsEvent.COLLECTION_VIEWED, collectionViewHandler);
    subscribe(AnalyticsEvent.SEARCH_VIEWED, searchViewHandler);

    // Cart
    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, productAddedToCartHandler);

    shopifyAnalyticsReady();
    setShopifyReady(true);
    analyticsReady();
  }, [subscribe, shopifyAnalyticsReady]);

  return null;
}

function logMissingConfig(fieldName: string) {
  // eslint-disable-next-line no-console
  console.error(
    `[h2:error:ShopifyAnalytics] Unable to send Shopify analytics: Missing shop.${fieldName} configuration.`,
  );
}

function prepareBasePageViewPayload(
  payload:
    | PageViewPayload
    | ProductViewPayload
    | CollectionViewPayload
    | SearchViewPayload
    | CartUpdatePayload,
): ShopifyPageViewPayload | undefined {
  const customerPrivacy = getCustomerPrivacyRequired();
  const hasUserConsent = customerPrivacy.analyticsProcessingAllowed();

  if (!payload?.shop?.shopId) {
    logMissingConfig('shopId');
    return;
  }
  if (!payload?.shop?.acceptedLanguage) {
    logMissingConfig('acceptedLanguage');
    return;
  }
  if (!payload?.shop?.currency) {
    logMissingConfig('currency');
    return;
  }
  if (!payload?.shop?.hydrogenSubchannelId) {
    logMissingConfig('hydrogenSubchannelId');
    return;
  }

  const eventPayload: ShopifyPageViewPayload = {
    shopifySalesChannel: 'hydrogen',
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    gdprEnforced: !(
      customerPrivacy.marketingAllowed() &&
      customerPrivacy.analyticsProcessingAllowed()
    ),
  };

  return eventPayload;
}

function prepareBaseCartPayload(
  payload: CartUpdatePayload,
  cart: CartReturn | null,
): ShopifyAddToCartPayload | undefined {
  if (cart === null) return;

  const pageViewPayload = prepareBasePageViewPayload(payload);

  if (!pageViewPayload) return;

  const eventPayload: ShopifyAddToCartPayload = {
    ...(pageViewPayload as ShopifyAddToCartPayload),
    cartId: cart.id,
  };

  return eventPayload;
}

// Forwarding view specific event payloads to page view handler
let viewPayload = {};

function pageViewHandler(payload: PageViewPayload) {
  const eventPayload = prepareBasePageViewPayload(payload);

  if (!eventPayload) return;

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW_2,
    payload: {
      ...eventPayload,
      ...viewPayload,
    },
  });
  viewPayload = {};
}

function productViewHandler(payload: ProductViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);

  if (
    eventPayload &&
    validateProducts({
      eventName: PRODUCT_VIEWED,
      productField: 'products',
      variantField: 'product.<displayed_variant>',
      fromSource: 'product_viewed products array',
      products: payload.products,
    })
  ) {
    const formattedProducts = formatProduct(payload.products);
    viewPayload = {
      pageType: AnalyticsPageType.product,
      resourceId: formattedProducts[0].productGid,
    };
    eventPayload = {
      ...eventPayload,
      ...viewPayload,
      products: formatProduct(payload.products),
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PRODUCT_VIEW,
      payload: eventPayload,
    });
  }
}

function collectionViewHandler(payload: CollectionViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);

  if (!eventPayload) return;

  viewPayload = {
    pageType: AnalyticsPageType.collection,
    resourceId: payload.collection.id,
  };
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    collectionHandle: payload.collection.handle,
  };

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.COLLECTION_VIEW,
    payload: eventPayload,
  });
}

function searchViewHandler(payload: SearchViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);

  if (!eventPayload) return;

  viewPayload = {
    pageType: AnalyticsPageType.search,
  };
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    searchString: payload.searchTerm,
  };

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.SEARCH_VIEW,
    payload: eventPayload,
  });
}

function productAddedToCartHandler(payload: CartLineUpdatePayload) {
  const {cart, currentLine} = payload;
  const eventPayload = prepareBaseCartPayload(payload, cart);

  if (!eventPayload || !currentLine?.id) return;

  sendCartAnalytics({
    matchedLine: currentLine,
    eventPayload,
  });
}

type AnalyticsProduct = {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  vendor: string;
  price: string;
  quantity: number;
  productType?: string;
  sku?: Maybe<string> | undefined;
};

function sendCartAnalytics({
  matchedLine,
  eventPayload,
}: {
  matchedLine: CartLine | ComponentizableCartLine;
  eventPayload: ShopifyAddToCartPayload;
}) {
  const product: AnalyticsProduct = {
    id: matchedLine.merchandise.product.id,
    variantId: matchedLine.id,
    title: matchedLine.merchandise.product.title,
    variantTitle: matchedLine.merchandise.title,
    vendor: matchedLine.merchandise.product.vendor,
    price: matchedLine.merchandise.price.amount,
    quantity: matchedLine.quantity,
    productType: matchedLine.merchandise.product.productType,
    sku: matchedLine.merchandise.sku,
  };
  if (
    validateProducts({
      eventName: ADD_TO_CART,
      productField: 'merchandise.product',
      variantField: 'merchandise',
      fromSource: 'cart query',
      products: [product],
    })
  ) {
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload: {
        ...eventPayload,
        products: formatProduct([product]),
      },
    });
  }
}

const PRODUCT_VIEWED = 'Product viewed';
const ADD_TO_CART = 'Add to cart';
function missingErrorMessage(
  eventName: string,
  missingFieldName: string,
  fromSource: string,
) {
  // eslint-disable-next-line no-console
  console.error(
    `[h2:error:ShopifyAnalytics] ${eventName}: ${missingFieldName} is required from the ${fromSource}.`,
  );
}

// Product expected field and types:
// variant_id: int, optional
// product_id: int, optional
// product_gid: string,
// name: string,
// price: float,
// sku: string, optional
// brand: string,
// variant: string,
// category: string, optional
// quantity: float
function validateProducts({
  eventName,
  productField,
  variantField,
  products,
  fromSource,
}: {
  eventName: string;
  productField: string;
  variantField: string;
  fromSource: string;
  products: Array<Record<string, unknown>>;
}) {
  if (!products || products.length === 0) {
    missingErrorMessage(eventName, `${productField}`, fromSource);
    return false;
  }

  products.forEach((product) => {
    if (!product.id) {
      missingErrorMessage(eventName, `${productField}.id`, fromSource);
      return false;
    }
    if (!product.title) {
      missingErrorMessage(eventName, `${productField}.title`, fromSource);
      return false;
    }
    if (!product.price) {
      missingErrorMessage(
        eventName,
        `${variantField}.price.amount`,
        fromSource,
      );
      return false;
    }
    if (!product.vendor) {
      missingErrorMessage(eventName, `${productField}.vendor`, fromSource);
      return false;
    }
    if (!product.variantId) {
      missingErrorMessage(eventName, `${variantField}.id`, fromSource);
      return false;
    }
    if (!product.variantTitle) {
      missingErrorMessage(eventName, `${variantField}.title`, fromSource);
      return false;
    }
  });
  return true;
}

function formatProduct(products: Array<AnalyticsProduct>) {
  return products.map((product) => {
    const formattedProduct = {
      productGid: product.id,
      variantGid: product.variantId,
      name: product.title,
      variantName: product.variantTitle,
      brand: product.vendor,
      price: product.price,
      quantity: product.quantity || 1,
      category: product.productType,
    } as ShopifyAnalyticsProduct;

    if (product.sku) formattedProduct.sku = product.sku;
    if (product.productType) formattedProduct.category = product.productType;

    return formattedProduct;
  });
}
