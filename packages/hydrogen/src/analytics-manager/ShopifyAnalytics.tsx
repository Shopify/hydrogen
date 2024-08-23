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
import {useEffect, useRef, useState} from 'react';
import {
  CartLine,
  ComponentizableCartLine,
  Maybe,
} from '@shopify/hydrogen-react/storefront-api-types';

function getCustomerPrivacyRequired() {
  const customerPrivacy = getCustomerPrivacy();

  if (!customerPrivacy) {
    throw new Error(
      'Shopify Customer Privacy API not available. Must be used within a useEffect. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacy() or <AnalyticsProvider>.',
    );
  }

  return customerPrivacy;
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
}: {
  consent: AnalyticsProviderProps['consent'];
  onReady: () => void;
  domain?: string;
}) {
  const {subscribe, register, canTrack} = useAnalytics();
  const [shopifyReady, setShopifyReady] = useState(false);
  const [privacyReady, setPrivacyReady] = useState(false);
  const init = useRef(false);
  const {checkoutDomain, storefrontAccessToken, language} = consent;
  const {ready: shopifyAnalyticsReady} = register('Internal_Shopify_Analytics');

  // load customer privacy and (optionally) the privacy banner APIs
  useCustomerPrivacy({
    ...consent,
    locale: language,
    checkoutDomain: !checkoutDomain ? 'mock.shop' : checkoutDomain,
    storefrontAccessToken: !storefrontAccessToken
      ? 'abcdefghijklmnopqrstuvwxyz123456'
      : storefrontAccessToken,
    onVisitorConsentCollected: () => setPrivacyReady(true),
    onReady: () => setPrivacyReady(true),
  });

  const hasUserConsent = privacyReady ? canTrack() : false;

  // set up shopify_Y and shopify_S cookies
  useShopifyCookies({hasUserConsent, domain, checkoutDomain});

  useEffect(() => {
    if (init.current) return;
    init.current = true;

    // Views
    subscribe(AnalyticsEvent.PAGE_VIEWED, pageViewHandler);
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, productViewHandler);
    subscribe(AnalyticsEvent.COLLECTION_VIEWED, collectionViewHandler);
    subscribe(AnalyticsEvent.SEARCH_VIEWED, searchViewHandler);

    // Cart
    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, productAddedToCartHandler);

    setShopifyReady(true);
  }, [subscribe]);

  useEffect(() => {
    if (shopifyReady && privacyReady) {
      shopifyAnalyticsReady();
      onReady();
    }
  }, [shopifyReady, privacyReady, onReady]);

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
      type: 'product',
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
      type: 'cart',
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

function missingErrorMessage(
  type: 'cart' | 'product',
  fieldName: string,
  isVariantField: boolean,
  viewKeyName?: string,
) {
  if (type === 'cart') {
    const name = `${
      isVariantField ? 'merchandise' : 'merchandise.product'
    }.${fieldName}`;
    // eslint-disable-next-line no-console
    console.error(
      `[h2:error:ShopifyAnalytics] Can't set up cart analytics events because the \`cart.lines[].${name}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartLine on CartLine\` is defined and make sure \`${name}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L25-L56.`,
    );
  } else {
    const name = `${viewKeyName || fieldName}`;
    // eslint-disable-next-line no-console
    console.error(
      `[h2:error:ShopifyAnalytics] Can't set up product view analytics events because the \`${name}\` is missing from your \`<Analytics.ProductView>\`. Make sure \`${name}\` is part of your products data prop. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/routes/products.%24handle.tsx#L159-L165.`,
    );
  }
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
  type,
  products,
}: {
  type: 'cart' | 'product';
  products: Array<Record<string, unknown>>;
}) {
  if (!products || products.length === 0) {
    missingErrorMessage(type, '', false, 'data.products');
    return false;
  }

  products.forEach((product) => {
    if (!product.id) {
      missingErrorMessage(type, 'id', false);
      return false;
    }
    if (!product.title) {
      missingErrorMessage(type, 'title', false);
      return false;
    }
    if (!product.price) {
      missingErrorMessage(type, 'price.amount', true, 'price');
      return false;
    }
    if (!product.vendor) {
      missingErrorMessage(type, 'vendor', false);
      return false;
    }
    if (!product.variantId) {
      missingErrorMessage(type, 'id', true, 'variantId');
      return false;
    }
    if (!product.variantTitle) {
      missingErrorMessage(type, 'title', true, 'variantTitle');
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
