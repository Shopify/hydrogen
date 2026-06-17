import { AnalyticsEvent } from "../events";
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  SearchViewPayload,
  CartLineUpdatePayload,
  ProductPayload,
  OtherData,
} from "../types";
import { getClientBrowserParameters } from "./utils/browser-params";
import {
  sendShopifyAnalytics,
  MonorailEventName,
  PageType,
  type ShopifyAnalyticsProduct,
  type PageViewPayload as MonorailPageViewPayload,
  type AddToCartPayload as MonorailAddToCartPayload,
} from "./utils/monorail";
import { HYDROGEN_VERSION as version } from "./utils/version";

function getCustomerPrivacy() {
  try {
    if (window.Shopify?.customerPrivacy) {
      return window.Shopify.customerPrivacy as {
        analyticsProcessingAllowed: () => boolean;
        marketingAllowed: () => boolean;
        saleOfDataAllowed: () => boolean;
      };
    }
  } catch {}
  return null;
}

function logMissingConfig(fieldName: string) {
  console.error(
    `[h3:error:Analytics] Unable to send Shopify analytics: Missing shop.${fieldName} configuration.`,
  );
}

function prepareBasePageViewPayload(payload: {
  shop?: {
    shopId?: string;
    acceptedLanguage?: string;
    currency?: string;
    hydrogenSubchannelId?: string;
  } | null;
}): MonorailPageViewPayload | undefined {
  const customerPrivacy = getCustomerPrivacy();
  if (!customerPrivacy) return;
  const hasUserConsent = customerPrivacy.analyticsProcessingAllowed();

  if (!payload?.shop?.shopId) {
    logMissingConfig("shopId");
    return;
  }
  if (!payload?.shop?.acceptedLanguage) {
    logMissingConfig("acceptedLanguage");
    return;
  }
  if (!payload?.shop?.currency) {
    logMissingConfig("currency");
    return;
  }
  if (!payload?.shop?.hydrogenSubchannelId) {
    logMissingConfig("hydrogenSubchannelId");
    return;
  }

  return {
    shopifySalesChannel: "hydrogen",
    assetVersionId: version,
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    analyticsAllowed: customerPrivacy.analyticsProcessingAllowed(),
    marketingAllowed: customerPrivacy.marketingAllowed(),
    saleOfDataAllowed: customerPrivacy.saleOfDataAllowed(),
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    gdprEnforced: !(
      customerPrivacy.marketingAllowed() && customerPrivacy.analyticsProcessingAllowed()
    ),
  } as MonorailPageViewPayload;
}

function prepareBaseCartPayload(payload: {
  shop?: PageViewPayload["shop"];
  cart?: { id: string } | null;
}): MonorailAddToCartPayload | undefined {
  if (!payload.cart) return;
  const pageViewPayload = prepareBasePageViewPayload(payload);
  if (!pageViewPayload) return;
  return { ...(pageViewPayload as MonorailAddToCartPayload), cartId: payload.cart.id };
}

function missingErrorMessage(
  type: "cart" | "product",
  fieldName: string,
  isVariantField: boolean,
  viewKeyName?: string,
) {
  if (type === "cart") {
    const name = `${isVariantField ? "merchandise" : "merchandise.product"}.${fieldName}`;
    console.error(
      `[h3:error:Analytics] Can't set up cart analytics events because the \`cart.lines[].${name}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartLine on CartLine\` is defined and make sure \`${name}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L25-L56.`,
    );
  } else {
    const name = viewKeyName || fieldName;
    console.error(
      `[h3:error:Analytics] Can't set up product view analytics events because the \`${name}\` is missing from your \`<Analytics.ProductView>\`. Make sure \`${name}\` is part of your products data prop. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/routes/products.%24handle.tsx#L159-L165.`,
    );
  }
}

function validateProducts({
  type,
  products,
}: {
  type: "cart" | "product";
  products: Array<Record<string, unknown>>;
}) {
  if (!products || products.length === 0) {
    missingErrorMessage(type, "", false, "data.products");
    return false;
  }

  for (const product of products) {
    if (!product.id) {
      missingErrorMessage(type, "id", false);
      return false;
    }
    if (!product.title) {
      missingErrorMessage(type, "title", false);
      return false;
    }
    if (!product.price) {
      missingErrorMessage(type, "price.amount", true, "price");
      return false;
    }
    if (!product.vendor) {
      missingErrorMessage(type, "vendor", false);
      return false;
    }
    if (!product.variantId) {
      missingErrorMessage(type, "id", true, "variantId");
      return false;
    }
    if (!product.variantTitle) {
      missingErrorMessage(type, "title", true, "variantTitle");
      return false;
    }
  }
  return true;
}

function formatProduct(products: Array<ProductPayload & OtherData>): ShopifyAnalyticsProduct[] {
  return products.map((product) => ({
    productGid: product.id,
    variantGid: product.variantId,
    name: product.title,
    variantName: product.variantTitle,
    brand: product.vendor,
    price: product.price,
    quantity: product.quantity || 1,
    category: product.productType,
    ...(product.sku ? { sku: product.sku } : {}),
  }));
}

export function createShopifyAnalyticsProcessor() {
  // Carries page-type context (pageType, resourceId, etc.) set by a specific
  // view handler (product/collection/search) so that the PAGE_VIEWED event
  // fired in the same navigation can include it. Cleared after each page view.
  let viewPayload: Record<string, unknown> = {};

  function handlePageView(payload: PageViewPayload) {
    const eventPayload = prepareBasePageViewPayload(payload);
    if (!eventPayload) return;

    // Merge any page-type context accumulated from a co-fired view event
    // (e.g. PRODUCT_VIEWED sets viewPayload before PAGE_VIEWED fires).
    sendShopifyAnalytics({
      eventName: MonorailEventName.PAGE_VIEW_2,
      payload: { ...eventPayload, ...viewPayload },
    });
    viewPayload = {};
  }

  function handleProductView(payload: ProductViewPayload) {
    let eventPayload = prepareBasePageViewPayload(payload);
    if (!eventPayload || !validateProducts({ type: "product", products: payload.products })) return;

    const formattedProducts = formatProduct(payload.products);
    // Stash page-type context for the PAGE_VIEWED event that fires alongside this one.
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

  function handleCollectionView(payload: CollectionViewPayload) {
    let eventPayload = prepareBasePageViewPayload(payload);
    if (!eventPayload) return;

    // Stash page-type context for the PAGE_VIEWED event that fires alongside this one.
    viewPayload = {
      pageType: PageType.collection,
      resourceId: payload.collection.id,
    };
    eventPayload = {
      ...eventPayload,
      ...viewPayload,
      collectionHandle: payload.collection.handle,
      collectionId: payload.collection.id,
    };

    sendShopifyAnalytics({
      eventName: MonorailEventName.COLLECTION_VIEW,
      payload: eventPayload,
    });
  }

  function handleSearchView(payload: SearchViewPayload) {
    let eventPayload = prepareBasePageViewPayload(payload);
    if (!eventPayload) return;

    // Stash page-type context for the PAGE_VIEWED event that fires alongside this one.
    viewPayload = { pageType: PageType.search };
    eventPayload = {
      ...eventPayload,
      ...viewPayload,
      searchString: payload.searchTerm,
    };

    sendShopifyAnalytics({
      eventName: MonorailEventName.SEARCH_VIEW,
      payload: eventPayload,
    });
  }

  function handleProductAddedToCart(payload: CartLineUpdatePayload) {
    const { cart, currentLine } = payload;
    const eventPayload = prepareBaseCartPayload({ shop: payload.shop, cart });
    if (!eventPayload || !currentLine?.id) return;

    // Flatten the cart line's nested merchandise fields into the shape
    // validateProducts and formatProduct expect.
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

    if (validateProducts({ type: "cart", products: [product] })) {
      sendShopifyAnalytics({
        eventName: MonorailEventName.ADD_TO_CART,
        payload: { ...eventPayload, products: formatProduct([product]) },
      });
    }
  }

  // Dispatch table mapping bus event names to their Monorail send handlers.
  const handlers: Record<string, (payload: unknown) => void> = {
    [AnalyticsEvent.PAGE_VIEWED]: (payload) => handlePageView(payload as PageViewPayload),
    [AnalyticsEvent.PRODUCT_VIEWED]: (payload) => handleProductView(payload as ProductViewPayload),
    [AnalyticsEvent.COLLECTION_VIEWED]: (payload) =>
      handleCollectionView(payload as CollectionViewPayload),
    [AnalyticsEvent.SEARCH_VIEWED]: (payload) => handleSearchView(payload as SearchViewPayload),
    [AnalyticsEvent.PRODUCT_ADD_TO_CART]: (payload) =>
      handleProductAddedToCart(payload as CartLineUpdatePayload),
  };

  return {
    handleEvent(event: string, payload: unknown) {
      handlers[event]?.(payload);
    },
  };
}
