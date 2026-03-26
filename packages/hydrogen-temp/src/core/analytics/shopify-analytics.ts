import {AnalyticsEvent} from './events';
import {
  sendShopifyAnalytics,
  MonorailEventName,
  PageType,
  getClientBrowserParameters,
  type ShopifyAnalyticsProduct,
  type MonorailPageViewPayload,
  type MonorailAddToCartPayload,
} from './utils';
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  SearchViewPayload,
  CartUpdatePayload,
  CartLineUpdatePayload,
  AnalyticsCart,
} from './types';
import {HYDROGEN_VERSION as version} from '../version';

type BusDeps = {
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
  register: (key: string) => {ready: () => void};
  publish: (event: string, payload: any) => void;
};

function getCustomerPrivacyRequired() {
  try {
    if (window.Shopify?.customerPrivacy) {
      return window.Shopify.customerPrivacy as {
        analyticsProcessingAllowed: () => boolean;
        marketingAllowed: () => boolean;
        saleOfDataAllowed: () => boolean;
      };
    }
  } catch {}

  throw new Error(
    'Shopify Customer Privacy API not available. Ensure consent has been initialized.',
  );
}

function logMissingConfig(fieldName: string) {
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
): MonorailPageViewPayload | undefined {
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

  return {
    shopifySalesChannel: 'hydrogen',
    assetVersionId: version,
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    analyticsAllowed: customerPrivacy.analyticsProcessingAllowed(),
    marketingAllowed: customerPrivacy.marketingAllowed(),
    saleOfDataAllowed: customerPrivacy.saleOfDataAllowed(),
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    gdprEnforced: !(
      customerPrivacy.marketingAllowed() &&
      customerPrivacy.analyticsProcessingAllowed()
    ),
  } as MonorailPageViewPayload;
}

function prepareBaseCartPayload(
  payload: CartUpdatePayload,
  cart: AnalyticsCart | null,
): MonorailAddToCartPayload | undefined {
  if (cart === null) return;
  const pageViewPayload = prepareBasePageViewPayload(payload);
  if (!pageViewPayload) return;
  return {...(pageViewPayload as MonorailAddToCartPayload), cartId: cart.id};
}

let viewPayload = {};

function pageViewHandler(payload: PageViewPayload) {
  const eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;

  sendShopifyAnalytics({
    eventName: MonorailEventName.PAGE_VIEW_2,
    payload: {...eventPayload, ...viewPayload},
  });
  viewPayload = {};
}

function productViewHandler(payload: ProductViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);

  if (
    eventPayload &&
    validateProducts({type: 'product', products: payload.products})
  ) {
    const formattedProducts = formatProduct(payload.products);
    viewPayload = {
      pageType: PageType.product,
      resourceId: formattedProducts[0].productGid,
    };
    eventPayload = {
      ...eventPayload,
      ...viewPayload,
      products: formattedProducts,
    };

    sendShopifyAnalytics({
      eventName: MonorailEventName.PRODUCT_VIEW,
      payload: eventPayload,
    });
  }
}

function collectionViewHandler(payload: CollectionViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;

  viewPayload = {
    pageType: PageType.collection,
    resourceId: (payload as any).collection.id,
  };
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    collectionHandle: (payload as any).collection.handle,
    collectionId: (payload as any).collection.id,
  };

  sendShopifyAnalytics({
    eventName: MonorailEventName.COLLECTION_VIEW,
    payload: eventPayload,
  });
}

function searchViewHandler(payload: SearchViewPayload) {
  let eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;

  viewPayload = {pageType: PageType.search};
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    searchString: (payload as any).searchTerm,
  };

  sendShopifyAnalytics({
    eventName: MonorailEventName.SEARCH_VIEW,
    payload: eventPayload,
  });
}

function productAddedToCartHandler(payload: CartLineUpdatePayload) {
  const {cart, currentLine} = payload;
  const eventPayload = prepareBaseCartPayload(payload, cart);
  if (!eventPayload || !currentLine?.id) return;

  const product = {
    id: currentLine.merchandise.product.id,
    variantId: currentLine.merchandise.id,
    title: currentLine.merchandise.product.title,
    variantTitle: currentLine.merchandise.title,
    vendor: currentLine.merchandise.product.vendor,
    price: currentLine.merchandise.price.amount,
    quantity: currentLine.quantity,
    productType: currentLine.merchandise.product.productType,
    sku: currentLine.merchandise.sku,
  };

  if (validateProducts({type: 'cart', products: [product]})) {
    sendShopifyAnalytics({
      eventName: MonorailEventName.ADD_TO_CART,
      payload: {...eventPayload, products: formatProduct([product])},
    });
  }
}

function validateProducts({
  type,
  products,
}: {
  type: 'cart' | 'product';
  products: Array<Record<string, unknown>>;
}) {
  if (!products || products.length === 0) return false;

  for (const product of products) {
    if (
      !product.id ||
      !product.title ||
      !product.price ||
      !product.vendor ||
      !product.variantId ||
      !product.variantTitle
    ) {
      return false;
    }
  }
  return true;
}

function formatProduct(
  products: Array<Record<string, any>>,
): ShopifyAnalyticsProduct[] {
  return products.map((product) => ({
    productGid: product.id,
    variantGid: product.variantId,
    name: product.title,
    variantName: product.variantTitle,
    brand: product.vendor,
    price: product.price,
    quantity: product.quantity || 1,
    category: product.productType,
    ...(product.sku ? {sku: product.sku} : {}),
  }));
}

/**
 * Initializes the Shopify Analytics internal subscriber on the bus.
 */
export function initShopifyAnalytics(deps: BusDeps) {
  deps.subscribe(AnalyticsEvent.PAGE_VIEWED, pageViewHandler);
  deps.subscribe(AnalyticsEvent.PRODUCT_VIEWED, productViewHandler);
  deps.subscribe(AnalyticsEvent.COLLECTION_VIEWED, collectionViewHandler);
  deps.subscribe(AnalyticsEvent.SEARCH_VIEWED, searchViewHandler);
  deps.subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, productAddedToCartHandler);
}
