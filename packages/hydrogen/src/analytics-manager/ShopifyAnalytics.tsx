import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
  type ShopifyPageViewPayload,
  AnalyticsPageType,
  ShopifyAnalyticsProduct,
  getCustomerPrivacy,
  getCustomerPrivacyRequired,
} from '@shopify/hydrogen';
import {useAnalyticsProvider} from './AnalyticsProvider';
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  CartViewPayload,
  CartUpdatePayload,
} from './AnalyticsView';
import {useEffect} from 'react';

/**
 * This component is responsible for sending analytics events to Shopify.
 * It emits the following events:
 * - page_viewed
 * - product_viewed
 * - collection_viewed
 * - cart_viewed
 * - cart_updated
 *   - product_added_to_cart
 *   - product_removed_from_cart
 *   - TODO: add more events
 *
*/
export function ShopifyAnalytics() {
  const {subscribe, register, canTrack} = useAnalyticsProvider();
  const {ready} = register('ShopifyAnalytics');
  const {ready: customerPrivacyReady} = register('ShopifyCustomerPrivacy');
  console.log('ShopifyAnalytics - canTrack', canTrack());

  useShopifyCookies({hasUserConsent: canTrack()});
  useEffect(() => {
    document.addEventListener('visitorConsentCollected', () => {;
      customerPrivacyReady();
    });

    // Views
    subscribe('page_viewed', pageViewHandler);
    subscribe('product_viewed', productViewHandler);
    subscribe('collection_viewed', collectionViewHandler);
    subscribe('cart_viewed', cartViewHandler);

    // Cart updates
    subscribe('cart_updated', cartUpdateHandler);

    ready();
  }, [subscribe, ready, customerPrivacyReady]);

  return null;
}

function pageViewHandler(payload: PageViewPayload) {
  const customerPrivacy = getCustomerPrivacyRequired();
  const hasUserConsent = customerPrivacy.userCanBeTracked();

  console.log('ShopifyAnalytics - page view hasUserConsent:', hasUserConsent);

  if (!payload?.shop?.shopId) {
    // eslint-disable-next-line no-console
    console.warn('ShopifyAnalytics - Missing shopId in page view payload');
    return;
  }

  const eventPayload: ShopifyPageViewPayload = {
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
  };

  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Page viewed', eventPayload);

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW,
    payload: eventPayload,
  });
}

function productViewHandler(payload: ProductViewPayload) {
  if (!payload?.shop?.shopId) {
    // eslint-disable-next-line no-console
    console.warn('ShopifyAnalytics - Missing shopId in page view payload');
    return;
  }

  if (validateProducts(payload.products)) {
    const formattedProducts = formatProduct(payload.products);
    const eventPayload: ShopifyPageViewPayload = {
      ...payload.shop,
      pageType: AnalyticsPageType.product,
      resourceId: formattedProducts[0].productGid,
      products: formatProduct(payload.products),
      hasUserConsent: true,
      ...getClientBrowserParameters(),
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload: eventPayload,
    });
  }
}

function collectionViewHandler(payload: CollectionViewPayload) {
  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Collection viewed:', payload);
}

function cartViewHandler(payload: CartViewPayload) {
  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Cart viewed:', payload);
}

function cartUpdateHandler(payload: CartUpdatePayload) {
  console.log('ShopifyAnalytics - Cart updated:', payload);
  const {cart, prevCart} = payload;

  // TODO: cleanup and simplify some of this logic using cart.totalCount instead

  // Compare previous cart against current cart lines
  // Detect quantity changes and missing cart lines
  prevCart?.lines?.nodes?.forEach((prevLine) => {
    const matchedLineId = cart?.lines.nodes.filter(
      (line) => prevLine.id === line.id,
    );
    if (matchedLineId?.length === 1) {
      const matchedLine = matchedLineId[0];
      if (prevLine.quantity < matchedLine.quantity) {
        // eslint-disable-next-line no-console
        console.log('ShopifyAnalytics - Added To Cart', {
          prevLine,
          quantity: matchedLine.quantity,
        });
      } else if (prevLine.quantity > matchedLine.quantity) {
        // eslint-disable-next-line no-console
        console.log('ShopifyAnalytics - Removed From Cart', {
          prevLine,
          quantity: matchedLine.quantity,
        });
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('ShopifyAnalytics - Removed From Cart', {
        prevLine,
        quantity: 0,
      });
    }
  });

  // Detect added to cart
  cart?.lines?.nodes?.forEach((line) => {
    const matchedLineId = prevCart?.lines.nodes.filter(
      (previousLine) => line.id === previousLine.id,
    );
    if (!matchedLineId || matchedLineId.length === 0) {
      // eslint-disable-next-line no-console
      console.log('ShopifyAnalytics - Added To Cart', {
        line,
        quantity: 1,
      });
    }
  });
}

const PRODUCT_VIEWED = 'Product viewed';
function missingErrorMessage(eventName: string, missingFieldName: string) {
  // eslint-disable-next-line no-console
  console.error(`ShopifyAnalytics - ${eventName}: ${missingFieldName} is required in the products array.`);
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
function validateProducts(products: Array<Record<string, unknown>>) {
  products.forEach((product) => {
    if (!product.id) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.id');
      return false;
    }
    if (!product.title) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.title');
      return false;
    }
    if (!product.price) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.<displayed_variant>.price.amount');
      return false;
    }
    if (!product.vendor) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.vendor');
      return false;
    }
    if (!product.variantId) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.<displayed_variant>.id');
      return false;
    }
    if (!product.variantTitle) {
      missingErrorMessage(PRODUCT_VIEWED, 'product.<displayed_variant>.title');
      return false;
    }
  });
  return true;
}

function formatProduct(products: Array<Record<string, unknown>>) {
  return products.map((product) => {
    return {
      productGid: product.id,
      variantGid: product.variantId,
      name: product.title,
      variantName: product.variantTitle,
      brand: product.vendor,
      price: product.price,
      quantity: product.quantity || 1,
      category: product.productType,
      sku: product.sku,
    } as ShopifyAnalyticsProduct;
  });
}
