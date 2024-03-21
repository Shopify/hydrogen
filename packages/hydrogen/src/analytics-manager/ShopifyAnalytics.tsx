import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
  type ShopifyPageViewPayload,
  AnalyticsPageType,
  ShopifyAnalyticsProduct,
  ShopifyAddToCartPayload,
  CartReturn,
} from '@shopify/hydrogen';
import {useAnalytics, type AnalyticsProviderProps} from './AnalyticsProvider';
import {useCustomerPrivacy, getCustomerPrivacyRequired} from '../customer-privacy/ShopifyCustomerPrivacy';
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  CartUpdatePayload,
  CartLineUpdatePayload,
} from './AnalyticsView';
import {useEffect} from 'react';
import {CartLine, ComponentizableCartLine, Maybe} from '@shopify/hydrogen-react/storefront-api-types';

/**
 * This component is responsible for sending analytics events to Shopify.
 * It emits the following events:
 * - page_viewed
 * - product_viewed
 * - collection_viewed
 * - cart_updated
 *   - product_added_to_cart
 *   - product_removed_from_cart
 *   - ...
*/
export function ShopifyAnalytics({consent}: {consent: AnalyticsProviderProps['consent']}) {
  const {subscribe, register, canTrack} = useAnalytics();
  const {ready: shopifyAnalyticsReady} = register('ShopifyAnalytics');
  const {ready: customerPrivacyReady} = register('ShopifyCustomerPrivacy');
  const {checkoutRootDomain, shopDomain, storefrontAccessToken} = consent;
  checkoutRootDomain && shopDomain && storefrontAccessToken && useCustomerPrivacy(consent);

  useShopifyCookies({hasUserConsent: canTrack()});
  useEffect(() => {
    document.addEventListener('visitorConsentCollected', customerPrivacyReady)

    return () => {
      document.removeEventListener('visitorConsentCollected', customerPrivacyReady);
    }
  }, [customerPrivacyReady])

  useEffect(() => {
    // Views
    subscribe('page_viewed', pageViewHandler);
    subscribe('product_viewed', productViewHandler);
    subscribe('collection_viewed', collectionViewHandler);

    // Cart
    subscribe('product_added_to_cart', productAddedToCartHandler);

    shopifyAnalyticsReady();
  }, [subscribe, shopifyAnalyticsReady]);

  return null;
}

function prepareBasePageViewPayload(payload: PageViewPayload | ProductViewPayload | CollectionViewPayload | CartUpdatePayload): ShopifyPageViewPayload | undefined {
  const customerPrivacy = getCustomerPrivacyRequired();
  const hasUserConsent = customerPrivacy.userCanBeTracked();

  if (!payload?.shop?.shopId) {
    // eslint-disable-next-line no-console
    console.warn('ShopifyAnalytics - Missing shopId in page view payload');
    return;
  }

  const eventPayload: ShopifyPageViewPayload = {
    shopifySalesChannel: 'hydrogen',
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    // @ts-ignore
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    // @ts-ignore
    gdprEnforced: !(customerPrivacy.marketingAllowed() && customerPrivacy.analyticsProcessingAllowed()),
  };

  return eventPayload;
};

function prepareBaseCartPayload(payload: CartUpdatePayload, cart: CartReturn | null): ShopifyAddToCartPayload | undefined {
  if (cart === null) return;

  const customerPrivacy = getCustomerPrivacyRequired();
  const hasUserConsent = customerPrivacy.userCanBeTracked();

  if (!payload?.shop?.shopId) {
    // eslint-disable-next-line no-console
    console.warn('ShopifyAnalytics - Missing shopId in add to cart payload');
    return;
  }

  const eventPayload: ShopifyAddToCartPayload = {
    shopifySalesChannel: 'hydrogen',
    cartId: cart.id,
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    // @ts-ignore
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    // @ts-ignore
    gdprEnforced: !(customerPrivacy.marketingAllowed() && customerPrivacy.analyticsProcessingAllowed()),
  };

  return eventPayload;
}

function pageViewHandler(payload: PageViewPayload) {
  const eventPayload = prepareBasePageViewPayload(payload);

  if (!eventPayload) return;

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW_2,
    payload: eventPayload,
  });
}

function productViewHandler(payload: ProductViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);

  if (eventPayload && validateProducts({
    eventName: PRODUCT_VIEWED,
    productField: 'products',
    variantField: 'product.<displayed_variant>',
    fromSource: 'product_viewed products array',
    products: payload.products
  })) {
    const formattedProducts = formatProduct(payload.products);
    eventPayload = {
      ...eventPayload,
      pageType: AnalyticsPageType.product,
      resourceId: formattedProducts[0].productGid,
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

  eventPayload = {
    ...eventPayload,
    pageType: AnalyticsPageType.collection,
    resourceId: payload.collection.id,
  };

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.COLLECTION_VIEW,
    payload: eventPayload,
  });
}

function productAddedToCartHandler(payload: CartLineUpdatePayload) {
  const {cart, currentLine} = payload;
  const eventPayload = prepareBaseCartPayload(payload, cart);

  if (!eventPayload || !currentLine) return;

  sendCartAnalytics({
    matchedLine: currentLine,
    eventPayload,
  });
}

type AnalyticsProduct = {
  id: string,
  variantId: string,
  title: string,
  variantTitle: string,
  vendor: string,
  price: string,
  quantity: number,
  productType?: string,
  sku?: Maybe<string> | undefined,
};

function sendCartAnalytics({
  matchedLine,
  eventPayload
}: {
  matchedLine: CartLine | ComponentizableCartLine,
  eventPayload: ShopifyAddToCartPayload
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
  if (validateProducts({
    eventName: ADD_TO_CART,
    productField: 'merchandise.product',
    variantField: 'merchandise',
    fromSource: 'cart query',
    products: [product]
  })) {
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
const REMOVE_FROM_CART = 'Remove from cart';
function missingErrorMessage(eventName: string, missingFieldName: string, fromSource: string) {
  // eslint-disable-next-line no-console
  console.error(`ShopifyAnalytics - ${eventName}: ${missingFieldName} is required from the ${fromSource}.`);
}

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
  eventName: string,
  productField: string,
  variantField: string,
  fromSource: string,
  products: Array<Record<string, unknown>>
}) {
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
      missingErrorMessage(eventName, `${variantField}.price.amount`, fromSource);
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
