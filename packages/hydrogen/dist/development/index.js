import { createContext, forwardRef, useContext, lazy, useMemo, useEffect, useRef, useState, createElement, Fragment as Fragment$1, Suspense } from 'react';
import { createContext as createContext$1, useFetcher, useFetchers, RouterContextProvider, useNavigation, useLocation, useNavigate, Link, useMatches } from 'react-router';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useLoadScript, createStorefrontClient as createStorefrontClient$1, SHOPIFY_STOREFRONT_ID_HEADER, getShopifyCookies, SHOPIFY_Y, SHOPIFY_STOREFRONT_Y_HEADER, SHOPIFY_S, SHOPIFY_STOREFRONT_S_HEADER, flattenConnection, RichText as RichText$1, ShopPayButton as ShopPayButton$1, useShopifyCookies, parseGid, sendShopifyAnalytics, AnalyticsEventName, AnalyticsPageType, getClientBrowserParameters } from '@shopify/hydrogen-react';
export { AnalyticsEventName, AnalyticsPageType, ExternalVideo, IMAGE_FRAGMENT, Image, MediaFile, ModelViewer, Money, ShopifySalesChannel, Video, customerAccountApiCustomScalars, decodeEncodedVariant, flattenConnection, getAdjacentAndFirstAvailableVariants, getClientBrowserParameters, getProductOptions, getShopifyCookies, isOptionValueCombinationInEncodedVariant, mapSelectedProductOptionToObject, parseGid, parseMetafield, sendShopifyAnalytics, storefrontApiCustomScalars, useLoadScript, useMoney, useSelectedOptionInUrlParam, useShopifyCookies } from '@shopify/hydrogen-react';
import { createGraphQLClient } from '@shopify/graphql-client';
import { parse, stringify } from 'worktop/cookie';
import cspBuilder from 'content-security-policy-builder';

// src/analytics-manager/AnalyticsProvider.tsx
function AnalyticsView(props) {
  const { type, data = {}, customData } = props;
  const location = useLocation();
  const {
    publish: publish2,
    cart,
    prevCart,
    shop,
    customData: analyticProviderCustomData
  } = useAnalytics();
  const url = location.pathname + location.search;
  let viewPayload2 = {
    ...data,
    customData: {
      ...analyticProviderCustomData,
      ...customData
    },
    cart,
    prevCart,
    shop
  };
  useEffect(() => {
    if (!shop?.shopId) return;
    viewPayload2 = {
      ...viewPayload2,
      url: window.location.href
    };
    publish2(type, viewPayload2);
  }, [publish2, url, shop?.shopId]);
  return null;
}
function AnalyticsPageView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props, type: "page_viewed" });
}
function AnalyticsProductView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props, type: "product_viewed" });
}
function AnalyticsCollectionView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props, type: "collection_viewed" });
}
function AnalyticsCartView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props, type: "cart_viewed" });
}
function AnalyticsSearchView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props, type: "search_viewed" });
}
function AnalyticsCustomView(props) {
  return /* @__PURE__ */ jsx(AnalyticsView, { ...props });
}

// src/analytics-manager/events.ts
var AnalyticsEvent = {
  // Views
  PAGE_VIEWED: "page_viewed",
  PRODUCT_VIEWED: "product_viewed",
  COLLECTION_VIEWED: "collection_viewed",
  CART_VIEWED: "cart_viewed",
  SEARCH_VIEWED: "search_viewed",
  // Cart
  CART_UPDATED: "cart_updated",
  PRODUCT_ADD_TO_CART: "product_added_to_cart",
  PRODUCT_REMOVED_FROM_CART: "product_removed_from_cart",
  // Custom
  CUSTOM_EVENT: `custom_`
};
var CONSENT_API = "https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js";
var CONSENT_API_WITH_BANNER = "https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js";
function logMissingConfig(fieldName) {
  console.error(
    `[h2:error:useCustomerPrivacy] Unable to setup Customer Privacy API: Missing consent.${fieldName} configuration.`
  );
}
function useCustomerPrivacy(props) {
  const {
    withPrivacyBanner = false,
    onVisitorConsentCollected,
    onReady,
    ...consentConfig
  } = props;
  useLoadScript(withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API, {
    attributes: {
      id: "customer-privacy-api"
    }
  });
  const { observing, setLoaded } = useApisLoaded({
    withPrivacyBanner,
    onLoaded: onReady
  });
  const config = useMemo(() => {
    const { checkoutDomain, storefrontAccessToken } = consentConfig;
    if (!checkoutDomain) logMissingConfig("checkoutDomain");
    if (!storefrontAccessToken) logMissingConfig("storefrontAccessToken");
    if (storefrontAccessToken.startsWith("shpat_") || storefrontAccessToken.length !== 32) {
      console.error(
        `[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token`
      );
    }
    const config2 = {
      checkoutRootDomain: checkoutDomain,
      storefrontAccessToken,
      storefrontRootDomain: parseStoreDomain(checkoutDomain),
      country: consentConfig.country,
      locale: consentConfig.locale
    };
    return config2;
  }, [consentConfig, parseStoreDomain, logMissingConfig]);
  useEffect(() => {
    const consentCollectedHandler = (event) => {
      if (onVisitorConsentCollected) {
        onVisitorConsentCollected(event.detail);
      }
    };
    document.addEventListener(
      "visitorConsentCollected",
      consentCollectedHandler
    );
    return () => {
      document.removeEventListener(
        "visitorConsentCollected",
        consentCollectedHandler
      );
    };
  }, [onVisitorConsentCollected]);
  useEffect(() => {
    if (!withPrivacyBanner || observing.current.privacyBanner) return;
    observing.current.privacyBanner = true;
    let customPrivacyBanner = window.privacyBanner || void 0;
    const privacyBannerWatcher = {
      configurable: true,
      get() {
        return customPrivacyBanner;
      },
      set(value) {
        if (typeof value === "object" && value !== null && "showPreferences" in value && "loadBanner" in value) {
          const privacyBanner = value;
          privacyBanner.loadBanner(config);
          customPrivacyBanner = overridePrivacyBannerMethods({
            privacyBanner,
            config
          });
          setLoaded.privacyBanner();
          emitCustomerPrivacyApiLoaded();
        }
      }
    };
    Object.defineProperty(window, "privacyBanner", privacyBannerWatcher);
  }, [
    withPrivacyBanner,
    config,
    overridePrivacyBannerMethods,
    setLoaded.privacyBanner
  ]);
  useEffect(() => {
    if (observing.current.customerPrivacy) return;
    observing.current.customerPrivacy = true;
    let customCustomerPrivacy = null;
    let customShopify = window.Shopify || void 0;
    Object.defineProperty(window, "Shopify", {
      configurable: true,
      get() {
        return customShopify;
      },
      set(value) {
        if (typeof value === "object" && value !== null && Object.keys(value).length === 0) {
          customShopify = value;
          Object.defineProperty(window.Shopify, "customerPrivacy", {
            configurable: true,
            get() {
              return customCustomerPrivacy;
            },
            set(value2) {
              if (typeof value2 === "object" && value2 !== null && "setTrackingConsent" in value2) {
                const customerPrivacy = value2;
                customCustomerPrivacy = {
                  ...customerPrivacy,
                  setTrackingConsent: overrideCustomerPrivacySetTrackingConsent(
                    { customerPrivacy, config }
                  )
                };
                customShopify = {
                  ...customShopify,
                  customerPrivacy: customCustomerPrivacy
                };
                setLoaded.customerPrivacy();
                emitCustomerPrivacyApiLoaded();
              }
            }
          });
        }
      }
    });
  }, [
    config,
    overrideCustomerPrivacySetTrackingConsent,
    setLoaded.customerPrivacy
  ]);
  const result = {
    customerPrivacy: getCustomerPrivacy()
  };
  if (withPrivacyBanner) {
    result.privacyBanner = getPrivacyBanner();
  }
  return result;
}
var hasEmitted = false;
function emitCustomerPrivacyApiLoaded() {
  if (hasEmitted) return;
  hasEmitted = true;
  const event = new CustomEvent("shopifyCustomerPrivacyApiLoaded");
  document.dispatchEvent(event);
}
function useApisLoaded({
  withPrivacyBanner,
  onLoaded
}) {
  const observing = useRef({ customerPrivacy: false, privacyBanner: false });
  const [apisLoaded, setApisLoaded] = useState(
    withPrivacyBanner ? [false, false] : [false]
  );
  const loaded = apisLoaded.every(Boolean);
  const setLoaded = {
    customerPrivacy: () => {
      if (withPrivacyBanner) {
        setApisLoaded((prev) => [true, prev[1]]);
      } else {
        setApisLoaded(() => [true]);
      }
    },
    privacyBanner: () => {
      if (!withPrivacyBanner) {
        return;
      }
      setApisLoaded((prev) => [prev[0], true]);
    }
  };
  useEffect(() => {
    if (loaded && onLoaded) {
      onLoaded();
    }
  }, [loaded, onLoaded]);
  return { observing, setLoaded };
}
function parseStoreDomain(checkoutDomain) {
  if (typeof window === "undefined") return;
  const host = window.document.location.host;
  const checkoutDomainParts = checkoutDomain.split(".").reverse();
  const currentDomainParts = host.split(".").reverse();
  const sameDomainParts = [];
  checkoutDomainParts.forEach((part, index) => {
    if (part === currentDomainParts[index]) {
      sameDomainParts.push(part);
    }
  });
  return sameDomainParts.reverse().join(".");
}
function overrideCustomerPrivacySetTrackingConsent({
  customerPrivacy,
  config
}) {
  const original = customerPrivacy.setTrackingConsent;
  const { locale, country, ...rest } = config;
  function updatedSetTrackingConsent(consent, callback) {
    original(
      {
        ...rest,
        headlessStorefront: true,
        ...consent
      },
      callback
    );
  }
  return updatedSetTrackingConsent;
}
function overridePrivacyBannerMethods({
  privacyBanner,
  config
}) {
  const originalLoadBanner = privacyBanner.loadBanner;
  const originalShowPreferences = privacyBanner.showPreferences;
  function loadBanner(userConfig) {
    if (typeof userConfig === "object") {
      originalLoadBanner({ ...config, ...userConfig });
      return;
    }
    originalLoadBanner(config);
  }
  function showPreferences(userConfig) {
    if (typeof userConfig === "object") {
      originalShowPreferences({ ...config, ...userConfig });
      return;
    }
    originalShowPreferences(config);
  }
  return { loadBanner, showPreferences };
}
function getCustomerPrivacy() {
  try {
    return window.Shopify && window.Shopify.customerPrivacy ? window.Shopify?.customerPrivacy : null;
  } catch (e) {
    return null;
  }
}
function getPrivacyBanner() {
  try {
    return window && window?.privacyBanner ? window.privacyBanner : null;
  } catch (e) {
    return null;
  }
}

// package.json
var version = "2025.7.0";

// src/analytics-manager/ShopifyAnalytics.tsx
function getCustomerPrivacyRequired() {
  const customerPrivacy = getCustomerPrivacy();
  if (!customerPrivacy) {
    throw new Error(
      "Shopify Customer Privacy API not available. Must be used within a useEffect. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacy() or <AnalyticsProvider>."
    );
  }
  return customerPrivacy;
}
function ShopifyAnalytics({
  consent,
  onReady,
  domain
}) {
  const { subscribe: subscribe2, register: register2, canTrack } = useAnalytics();
  const [shopifyReady, setShopifyReady] = useState(false);
  const [privacyReady, setPrivacyReady] = useState(false);
  const init = useRef(false);
  const { checkoutDomain, storefrontAccessToken, language } = consent;
  const { ready: shopifyAnalyticsReady } = register2("Internal_Shopify_Analytics");
  useCustomerPrivacy({
    ...consent,
    locale: language,
    checkoutDomain: !checkoutDomain ? "mock.shop" : checkoutDomain,
    storefrontAccessToken: !storefrontAccessToken ? "abcdefghijklmnopqrstuvwxyz123456" : storefrontAccessToken,
    onVisitorConsentCollected: () => setPrivacyReady(true),
    onReady: () => setPrivacyReady(true)
  });
  useShopifyCookies({
    hasUserConsent: privacyReady ? canTrack() : true,
    // must be initialized with true
    domain,
    checkoutDomain
  });
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    subscribe2(AnalyticsEvent.PAGE_VIEWED, pageViewHandler);
    subscribe2(AnalyticsEvent.PRODUCT_VIEWED, productViewHandler);
    subscribe2(AnalyticsEvent.COLLECTION_VIEWED, collectionViewHandler);
    subscribe2(AnalyticsEvent.SEARCH_VIEWED, searchViewHandler);
    subscribe2(AnalyticsEvent.PRODUCT_ADD_TO_CART, productAddedToCartHandler);
    setShopifyReady(true);
  }, [subscribe2]);
  useEffect(() => {
    if (shopifyReady && privacyReady) {
      shopifyAnalyticsReady();
      onReady();
    }
  }, [shopifyReady, privacyReady, onReady]);
  return null;
}
function logMissingConfig2(fieldName) {
  console.error(
    `[h2:error:ShopifyAnalytics] Unable to send Shopify analytics: Missing shop.${fieldName} configuration.`
  );
}
function prepareBasePageViewPayload(payload) {
  const customerPrivacy = getCustomerPrivacyRequired();
  const hasUserConsent = customerPrivacy.analyticsProcessingAllowed();
  if (!payload?.shop?.shopId) {
    logMissingConfig2("shopId");
    return;
  }
  if (!payload?.shop?.acceptedLanguage) {
    logMissingConfig2("acceptedLanguage");
    return;
  }
  if (!payload?.shop?.currency) {
    logMissingConfig2("currency");
    return;
  }
  if (!payload?.shop?.hydrogenSubchannelId) {
    logMissingConfig2("hydrogenSubchannelId");
    return;
  }
  const eventPayload = {
    shopifySalesChannel: "hydrogen",
    assetVersionId: version,
    ...payload.shop,
    hasUserConsent,
    ...getClientBrowserParameters(),
    analyticsAllowed: customerPrivacy.analyticsProcessingAllowed(),
    marketingAllowed: customerPrivacy.marketingAllowed(),
    saleOfDataAllowed: customerPrivacy.saleOfDataAllowed(),
    ccpaEnforced: !customerPrivacy.saleOfDataAllowed(),
    gdprEnforced: !(customerPrivacy.marketingAllowed() && customerPrivacy.analyticsProcessingAllowed())
  };
  return eventPayload;
}
function prepareBaseCartPayload(payload, cart) {
  if (cart === null) return;
  const pageViewPayload = prepareBasePageViewPayload(payload);
  if (!pageViewPayload) return;
  const eventPayload = {
    ...pageViewPayload,
    cartId: cart.id
  };
  return eventPayload;
}
var viewPayload = {};
function pageViewHandler(payload) {
  const eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;
  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW_2,
    payload: {
      ...eventPayload,
      ...viewPayload
    }
  });
  viewPayload = {};
}
function productViewHandler(payload) {
  let eventPayload = prepareBasePageViewPayload(payload);
  if (eventPayload && validateProducts({
    type: "product",
    products: payload.products
  })) {
    const formattedProducts = formatProduct(payload.products);
    viewPayload = {
      pageType: AnalyticsPageType.product,
      resourceId: formattedProducts[0].productGid
    };
    eventPayload = {
      ...eventPayload,
      ...viewPayload,
      products: formatProduct(payload.products)
    };
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PRODUCT_VIEW,
      payload: eventPayload
    });
  }
}
function collectionViewHandler(payload) {
  let eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;
  viewPayload = {
    pageType: AnalyticsPageType.collection,
    resourceId: payload.collection.id
  };
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    collectionHandle: payload.collection.handle,
    collectionId: payload.collection.id
  };
  sendShopifyAnalytics({
    eventName: AnalyticsEventName.COLLECTION_VIEW,
    payload: eventPayload
  });
}
function searchViewHandler(payload) {
  let eventPayload = prepareBasePageViewPayload(payload);
  if (!eventPayload) return;
  viewPayload = {
    pageType: AnalyticsPageType.search
  };
  eventPayload = {
    ...eventPayload,
    ...viewPayload,
    searchString: payload.searchTerm
  };
  sendShopifyAnalytics({
    eventName: AnalyticsEventName.SEARCH_VIEW,
    payload: eventPayload
  });
}
function productAddedToCartHandler(payload) {
  const { cart, currentLine } = payload;
  const eventPayload = prepareBaseCartPayload(payload, cart);
  if (!eventPayload || !currentLine?.id) return;
  sendCartAnalytics({
    matchedLine: currentLine,
    eventPayload
  });
}
function sendCartAnalytics({
  matchedLine,
  eventPayload
}) {
  const product = {
    id: matchedLine.merchandise.product.id,
    variantId: matchedLine.merchandise.id,
    title: matchedLine.merchandise.product.title,
    variantTitle: matchedLine.merchandise.title,
    vendor: matchedLine.merchandise.product.vendor,
    price: matchedLine.merchandise.price.amount,
    quantity: matchedLine.quantity,
    productType: matchedLine.merchandise.product.productType,
    sku: matchedLine.merchandise.sku
  };
  if (validateProducts({
    type: "cart",
    products: [product]
  })) {
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload: {
        ...eventPayload,
        products: formatProduct([product])
      }
    });
  }
}
function missingErrorMessage(type, fieldName, isVariantField, viewKeyName) {
  if (type === "cart") {
    const name = `${isVariantField ? "merchandise" : "merchandise.product"}.${fieldName}`;
    console.error(
      `[h2:error:ShopifyAnalytics] Can't set up cart analytics events because the \`cart.lines[].${name}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartLine on CartLine\` is defined and make sure \`${name}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L25-L56.`
    );
  } else {
    const name = `${viewKeyName || fieldName}`;
    console.error(
      `[h2:error:ShopifyAnalytics] Can't set up product view analytics events because the \`${name}\` is missing from your \`<Analytics.ProductView>\`. Make sure \`${name}\` is part of your products data prop. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/routes/products.%24handle.tsx#L159-L165.`
    );
  }
}
function validateProducts({
  type,
  products
}) {
  if (!products || products.length === 0) {
    missingErrorMessage(type, "", false, "data.products");
    return false;
  }
  products.forEach((product) => {
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
  });
  return true;
}
function formatProduct(products) {
  return products.map((product) => {
    const formattedProduct = {
      productGid: product.id,
      variantGid: product.variantId,
      name: product.title,
      variantName: product.variantTitle,
      brand: product.vendor,
      price: product.price,
      quantity: product.quantity || 1,
      category: product.productType
    };
    if (product.sku) formattedProduct.sku = product.sku;
    if (product.productType) formattedProduct.category = product.productType;
    return formattedProduct;
  });
}
function logMissingField(fieldName) {
  console.error(
    `[h2:error:CartAnalytics] Can't set up cart analytics events because the \`cart.${fieldName}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartApiQuery on Cart\` is defined and make sure \`${fieldName}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L59.`
  );
}
function CartAnalytics({
  cart: currentCart,
  setCarts
}) {
  const { publish: publish2, shop, customData, canTrack, cart, prevCart } = useAnalytics();
  const lastEventId = useRef(null);
  useEffect(() => {
    if (!currentCart) return;
    Promise.resolve(currentCart).then((updatedCart) => {
      if (updatedCart && updatedCart.lines) {
        if (!updatedCart.id) {
          logMissingField("id");
          return;
        }
        if (!updatedCart.updatedAt) {
          logMissingField("updatedAt");
          return;
        }
      }
      setCarts(({ cart: cart2, prevCart: prevCart2 }) => {
        return updatedCart?.updatedAt !== cart2?.updatedAt ? { cart: updatedCart, prevCart: cart2 } : { cart: cart2, prevCart: prevCart2 };
      });
    });
    return () => {
    };
  }, [setCarts, currentCart]);
  useEffect(() => {
    if (!cart || !cart?.updatedAt) return;
    if (cart?.updatedAt === prevCart?.updatedAt) return;
    let cartLastUpdatedAt;
    try {
      cartLastUpdatedAt = JSON.parse(
        localStorage.getItem("cartLastUpdatedAt") || ""
      );
    } catch (e) {
      cartLastUpdatedAt = null;
    }
    if (cart.id === cartLastUpdatedAt?.id && cart.updatedAt === cartLastUpdatedAt?.updatedAt)
      return;
    const payload = {
      eventTimestamp: Date.now(),
      cart,
      prevCart,
      shop,
      customData
    };
    if (cart.updatedAt === lastEventId.current) return;
    lastEventId.current = cart.updatedAt;
    publish2("cart_updated", payload);
    localStorage.setItem(
      "cartLastUpdatedAt",
      JSON.stringify({
        id: cart.id,
        updatedAt: cart.updatedAt
      })
    );
    const previousCartLines = prevCart?.lines ? flattenConnection(prevCart?.lines) : [];
    const currentCartLines = cart.lines ? flattenConnection(cart.lines) : [];
    previousCartLines?.forEach((prevLine) => {
      const matchedLineId = currentCartLines.filter(
        (line) => prevLine.id === line.id
      );
      if (matchedLineId?.length === 1) {
        const matchedLine = matchedLineId[0];
        if (prevLine.quantity < matchedLine.quantity) {
          publish2("product_added_to_cart", {
            ...payload,
            prevLine,
            currentLine: matchedLine
          });
        } else if (prevLine.quantity > matchedLine.quantity) {
          publish2("product_removed_from_cart", {
            ...payload,
            prevLine,
            currentLine: matchedLine
          });
        }
      } else {
        publish2("product_removed_from_cart", {
          ...payload,
          prevLine
        });
      }
    });
    currentCartLines?.forEach((line) => {
      const matchedLineId = previousCartLines.filter(
        (previousLine) => line.id === previousLine.id
      );
      if (!matchedLineId || matchedLineId.length === 0) {
        publish2("product_added_to_cart", {
          ...payload,
          currentLine: line
        });
      }
    });
  }, [cart, prevCart, publish2, shop, customData, canTrack]);
  return null;
}
var PERF_KIT_URL = "https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js";
function PerfKit({ shop }) {
  const loadedEvent = useRef(false);
  const { subscribe: subscribe2, register: register2 } = useAnalytics();
  const { ready } = register2("Internal_Shopify_Perf_Kit");
  const scriptStatus = useLoadScript(PERF_KIT_URL, {
    attributes: {
      id: "perfkit",
      "data-application": "hydrogen",
      "data-shop-id": parseGid(shop.shopId).id.toString(),
      "data-storefront-id": shop.hydrogenSubchannelId,
      "data-monorail-region": "global",
      "data-spa-mode": "true",
      "data-resource-timing-sampling-rate": "100"
    }
  });
  useEffect(() => {
    if (scriptStatus !== "done" || loadedEvent.current) return;
    loadedEvent.current = true;
    subscribe2(AnalyticsEvent.PAGE_VIEWED, () => {
      window.PerfKit?.navigate();
    });
    subscribe2(AnalyticsEvent.PRODUCT_VIEWED, () => {
      window.PerfKit?.setPageType("product");
    });
    subscribe2(AnalyticsEvent.COLLECTION_VIEWED, () => {
      window.PerfKit?.setPageType("collection");
    });
    subscribe2(AnalyticsEvent.SEARCH_VIEWED, () => {
      window.PerfKit?.setPageType("search");
    });
    subscribe2(AnalyticsEvent.CART_VIEWED, () => {
      window.PerfKit?.setPageType("cart");
    });
    ready();
  }, [subscribe2, ready, scriptStatus]);
  return null;
}

// src/utils/warning.ts
var warnings = /* @__PURE__ */ new Set();
var warnOnce = (string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
var errors = /* @__PURE__ */ new Set();
var errorOnce = (string) => {
  if (!errors.has(string)) {
    console.error(new Error(string));
    errors.add(string);
  }
};
var defaultAnalyticsContext = {
  canTrack: () => false,
  cart: null,
  customData: {},
  prevCart: null,
  publish: () => {
  },
  shop: null,
  subscribe: () => {
  },
  register: () => ({ ready: () => {
  } }),
  customerPrivacy: null,
  privacyBanner: null
};
var AnalyticsContext = createContext(
  defaultAnalyticsContext
);
var subscribers = /* @__PURE__ */ new Map();
var registers = {};
function areRegistersReady() {
  return Object.values(registers).every(Boolean);
}
function subscribe(event, callback) {
  if (!subscribers.has(event)) {
    subscribers.set(event, /* @__PURE__ */ new Map());
  }
  subscribers.get(event)?.set(callback.toString(), callback);
}
var waitForReadyQueue = /* @__PURE__ */ new Map();
function publish(event, payload) {
  if (!areRegistersReady()) {
    waitForReadyQueue.set(event, payload);
    return;
  }
  publishEvent(event, payload);
}
function publishEvent(event, payload) {
  (subscribers.get(event) ?? /* @__PURE__ */ new Map()).forEach((callback, subscriber) => {
    try {
      callback(payload);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        console.error(
          "Analytics publish error",
          error.message,
          subscriber,
          error.stack
        );
      } else {
        console.error("Analytics publish error", error, subscriber);
      }
    }
  });
}
function register(key) {
  if (!registers.hasOwnProperty(key)) {
    registers[key] = false;
  }
  return {
    ready: () => {
      registers[key] = true;
      if (areRegistersReady() && waitForReadyQueue.size > 0) {
        waitForReadyQueue.forEach((queuePayload, queueEvent) => {
          publishEvent(queueEvent, queuePayload);
        });
        waitForReadyQueue.clear();
      }
    }
  };
}
function shopifyCanTrack() {
  try {
    return window.Shopify.customerPrivacy.analyticsProcessingAllowed();
  } catch (e) {
  }
  return false;
}
function messageOnError(field, envVar) {
  return `[h2:error:Analytics.Provider] - ${field} is required. Make sure ${envVar} is defined in your environment variables. See https://h2o.fyi/analytics/consent to learn how to setup environment variables in the Shopify admin.`;
}
function AnalyticsProvider({
  canTrack: customCanTrack,
  cart: currentCart,
  children,
  consent,
  customData = {},
  shop: shopProp = null,
  cookieDomain
}) {
  const listenerSet = useRef(false);
  const { shop } = useShopAnalytics(shopProp);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(
    customCanTrack ? true : false
  );
  const [carts, setCarts] = useState({ cart: null, prevCart: null });
  const [canTrack, setCanTrack] = useState(
    customCanTrack ? () => customCanTrack : () => shopifyCanTrack
  );
  if (!!shop) {
    if (/\/68817551382$/.test(shop.shopId)) {
      warnOnce(
        "[h2:error:Analytics.Provider] - Mock shop is used. Analytics will not work properly."
      );
    } else {
      if (!consent.checkoutDomain) {
        const errorMsg = messageOnError(
          "consent.checkoutDomain",
          "PUBLIC_CHECKOUT_DOMAIN"
        );
        errorOnce(errorMsg);
      }
      if (!consent.storefrontAccessToken) {
        const errorMsg = messageOnError(
          "consent.storefrontAccessToken",
          "PUBLIC_STOREFRONT_API_TOKEN"
        );
        errorOnce(errorMsg);
      }
      if (!consent?.country) {
        consent.country = "US";
      }
      if (!consent?.language) {
        consent.language = "EN";
      }
      if (consent.withPrivacyBanner === void 0) {
        consent.withPrivacyBanner = false;
      }
    }
  }
  const value = useMemo(() => {
    return {
      canTrack,
      ...carts,
      customData,
      publish: canTrack() ? publish : () => {
      },
      shop,
      subscribe,
      register,
      customerPrivacy: getCustomerPrivacy(),
      privacyBanner: getPrivacyBanner()
    };
  }, [
    analyticsLoaded,
    canTrack,
    carts,
    carts.cart?.updatedAt,
    carts.prevCart,
    publish,
    subscribe,
    customData,
    shop,
    register,
    JSON.stringify(registers),
    getCustomerPrivacy,
    getPrivacyBanner
  ]);
  return /* @__PURE__ */ jsxs(AnalyticsContext.Provider, { value, children: [
    children,
    !!shop && /* @__PURE__ */ jsx(AnalyticsPageView, {}),
    !!shop && !!currentCart && /* @__PURE__ */ jsx(CartAnalytics, { cart: currentCart, setCarts }),
    !!shop && consent.checkoutDomain && /* @__PURE__ */ jsx(
      ShopifyAnalytics,
      {
        consent,
        onReady: () => {
          listenerSet.current = true;
          setAnalyticsLoaded(true);
          setCanTrack(
            customCanTrack ? () => customCanTrack : () => shopifyCanTrack
          );
        },
        domain: cookieDomain
      }
    ),
    !!shop && /* @__PURE__ */ jsx(PerfKit, { shop })
  ] });
}
function useAnalytics() {
  const analyticsContext = useContext(AnalyticsContext);
  if (!analyticsContext) {
    throw new Error(
      `[h2:error:useAnalytics] 'useAnalytics()' must be a descendent of <AnalyticsProvider/>`
    );
  }
  return analyticsContext;
}
function useShopAnalytics(shopProp) {
  const [shop, setShop] = useState(null);
  useEffect(() => {
    Promise.resolve(shopProp).then(setShop);
    return () => {
    };
  }, [setShop, shopProp]);
  return { shop };
}
async function getShopAnalytics({
  storefront,
  publicStorefrontId = "0"
}) {
  return storefront.query(SHOP_QUERY, {
    cache: storefront.CacheLong()
  }).then(({ shop, localization }) => {
    return {
      shopId: shop.id,
      acceptedLanguage: localization.language.isoCode,
      currency: localization.country.currency.isoCode,
      hydrogenSubchannelId: publicStorefrontId
    };
  });
}
var SHOP_QUERY = `#graphql
  query ShopData(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop {
      id
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
      language {
        isoCode
      }
    }
  }
`;
var Analytics = {
  CartView: AnalyticsCartView,
  CollectionView: AnalyticsCollectionView,
  CustomView: AnalyticsCustomView,
  ProductView: AnalyticsProductView,
  Provider: AnalyticsProvider,
  SearchView: AnalyticsSearchView
};

// src/utils/request.ts
function getHeader(request, key) {
  return getHeaderValue(request.headers, key);
}
function getHeaderValue(headers, key) {
  const value = headers?.get?.(key) ?? headers?.[key];
  return typeof value === "string" ? value : null;
}
function getDebugHeaders(request) {
  return {
    requestId: request ? getHeader(request, "request-id") : void 0,
    purpose: request ? getHeader(request, "purpose") : void 0
  };
}

// src/utils/callsites.ts
function withSyncStack(promise, options = {}) {
  const syncError = new Error();
  const getSyncStack = (message, name = "Error") => {
    const syncStack = (syncError.stack ?? "").split("\n").slice(3 + (options.stackOffset ?? 0)).join("\n").replace(/ at loader(\d+) \(/, (all, m1) => all.replace(m1, ""));
    return `${name}: ${message}
` + syncStack;
  };
  return promise.then((result) => {
    if (result?.errors && Array.isArray(result.errors)) {
      const logErrors = typeof options.logErrors === "function" ? options.logErrors : () => options.logErrors ?? false;
      result.errors.forEach((error) => {
        if (error) {
          error.stack = getSyncStack(error.message, error.name);
          if (logErrors(error)) console.error(error);
        }
      });
    }
    return result;
  }).catch((error) => {
    if (error) error.stack = getSyncStack(error.message, error.name);
    throw error;
  });
}
var getCallerStackLine = (stackOffset = 0) => {
  let stackInfo = void 0;
  const original = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, callsites) => {
    const cs = callsites[2 + stackOffset];
    stackInfo = cs && {
      file: cs.getFileName() ?? void 0,
      func: cs.getFunctionName() ?? void 0,
      line: cs.getLineNumber() ?? void 0,
      column: cs.getColumnNumber() ?? void 0
    };
    return "";
  };
  const err = { stack: "" };
  Error.captureStackTrace(err);
  err.stack;
  Error.prepareStackTrace = original;
  return stackInfo;
} ;

// src/cache/strategies.ts
var PUBLIC = "public";
var PRIVATE = "private";
var NO_STORE = "no-store";
var optionMapping = {
  maxAge: "max-age",
  staleWhileRevalidate: "stale-while-revalidate",
  sMaxAge: "s-maxage",
  staleIfError: "stale-if-error"
};
function generateCacheControlHeader(cacheOptions) {
  const cacheControl = [];
  Object.keys(cacheOptions).forEach((key) => {
    if (key === "mode") {
      cacheControl.push(cacheOptions[key]);
    } else if (optionMapping[key]) {
      cacheControl.push(
        `${optionMapping[key]}=${cacheOptions[key]}`
      );
    }
  });
  return cacheControl.join(", ");
}
function CacheNone() {
  return {
    mode: NO_STORE
  };
}
function guardExpirableModeType(overrideOptions) {
  if (overrideOptions?.mode && overrideOptions?.mode !== PUBLIC && overrideOptions?.mode !== PRIVATE) {
    throw Error("'mode' must be either 'public' or 'private'");
  }
}
function CacheShort(overrideOptions) {
  guardExpirableModeType(overrideOptions);
  return {
    mode: PUBLIC,
    maxAge: 1,
    staleWhileRevalidate: 9,
    ...overrideOptions
  };
}
function CacheLong(overrideOptions) {
  guardExpirableModeType(overrideOptions);
  return {
    mode: PUBLIC,
    maxAge: 3600,
    // 1 hour
    staleWhileRevalidate: 82800,
    // 23 Hours
    ...overrideOptions
  };
}
function CacheDefault(overrideOptions) {
  guardExpirableModeType(overrideOptions);
  return {
    mode: PUBLIC,
    maxAge: 1,
    staleWhileRevalidate: 86399,
    // 1 second less than 24 hours
    ...overrideOptions
  };
}
function CacheCustom(overrideOptions) {
  return overrideOptions;
}

// src/utils/parse-json.ts
function parseJSON(json) {
  if (String(json).includes("__proto__")) return JSON.parse(json, noproto);
  return JSON.parse(json);
}
function noproto(k, v) {
  if (k !== "__proto__") return v;
}
function getCacheControlSetting(userCacheOptions, options) {
  if (userCacheOptions && options) {
    return {
      ...userCacheOptions,
      ...options
    };
  } else {
    return userCacheOptions || CacheDefault();
  }
}
function generateDefaultCacheControlHeader(userCacheOptions) {
  return generateCacheControlHeader(getCacheControlSetting(userCacheOptions));
}
async function getItem(cache, request) {
  if (!cache) return;
  const response = await cache.match(request);
  if (!response) {
    return;
  }
  return response;
}
async function setItem(cache, request, response, userCacheOptions) {
  if (!cache) return;
  const cacheControl = getCacheControlSetting(userCacheOptions);
  const paddedCacheControlString = generateDefaultCacheControlHeader(
    getCacheControlSetting(cacheControl, {
      maxAge: (cacheControl.maxAge || 0) + (cacheControl.staleWhileRevalidate || 0)
    })
  );
  const cacheControlString = generateDefaultCacheControlHeader(
    getCacheControlSetting(cacheControl)
  );
  response.headers.set("cache-control", paddedCacheControlString);
  response.headers.set("real-cache-control", cacheControlString);
  response.headers.set("cache-put-date", String(Date.now()));
  await cache.put(request, response);
}
async function deleteItem(cache, request) {
  if (!cache) return;
  await cache.delete(request);
}
function calculateAge(response, responseDate) {
  const cacheControl = response.headers.get("real-cache-control");
  let responseMaxAge = 0;
  if (cacheControl) {
    const maxAgeMatch = cacheControl.match(/max-age=(\d*)/);
    if (maxAgeMatch && maxAgeMatch.length > 1) {
      responseMaxAge = parseFloat(maxAgeMatch[1]);
    }
  }
  const ageInMs = Date.now() - Number(responseDate);
  return [ageInMs / 1e3, responseMaxAge];
}
function isStale(request, response) {
  const responseDate = response.headers.get("cache-put-date");
  if (!responseDate) {
    return false;
  }
  const [age, responseMaxAge] = calculateAge(response, responseDate);
  const result = age > responseMaxAge;
  return result;
}
var CacheAPI = {
  get: getItem,
  set: setItem,
  delete: deleteItem,
  generateDefaultCacheControlHeader,
  isStale
};

// src/cache/sub-request.ts
function getKeyUrl(key) {
  return `https://shopify.dev/?${key}`;
}
function getCacheOption(userCacheOptions) {
  return userCacheOptions || CacheDefault();
}
async function getItemFromCache(cache, key) {
  if (!cache) return;
  const url = getKeyUrl(key);
  const request = new Request(url);
  const response = await CacheAPI.get(cache, request);
  if (!response) {
    return;
  }
  const text = await response.text();
  try {
    return [parseJSON(text), response];
  } catch {
    return [text, response];
  }
}
async function setItemInCache(cache, key, value, userCacheOptions) {
  if (!cache) return;
  const url = getKeyUrl(key);
  const request = new Request(url);
  const response = new Response(JSON.stringify(value));
  await CacheAPI.set(
    cache,
    request,
    response,
    getCacheOption(userCacheOptions)
  );
}
function isStale2(key, response) {
  return CacheAPI.isStale(new Request(getKeyUrl(key)), response);
}

// src/utils/hash.ts
function hashKey(queryKey) {
  const rawKeys = Array.isArray(queryKey) ? queryKey : [queryKey];
  let hash = "";
  for (const key of rawKeys) {
    if (key != null) {
      if (typeof key === "object") {
        hash += JSON.stringify(key);
      } else {
        hash += key.toString();
      }
    }
  }
  return encodeURIComponent(hash);
}

// src/cache/run-with-cache.ts
var swrLock = /* @__PURE__ */ new Set();
async function runWithCache(cacheKey, actionFn, {
  strategy = CacheShort(),
  cacheInstance,
  shouldCacheResult = () => true,
  waitUntil,
  debugInfo
}) {
  const startTime = Date.now();
  const key = hashKey([
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...typeof cacheKey === "string" ? [cacheKey] : cacheKey
  ]);
  let cachedDebugInfo;
  let userDebugInfo;
  const addDebugData = (info) => {
    userDebugInfo = {
      displayName: info.displayName,
      url: info.response?.url,
      responseInit: {
        status: info.response?.status || 0,
        statusText: info.response?.statusText || "",
        headers: Array.from(info.response?.headers.entries() || [])
      }
    };
  };
  const mergeDebugInfo = () => ({
    ...cachedDebugInfo,
    ...debugInfo,
    url: userDebugInfo?.url || debugInfo?.url || cachedDebugInfo?.url || getKeyUrl(key),
    displayName: debugInfo?.displayName || userDebugInfo?.displayName || cachedDebugInfo?.displayName
  });
  const logSubRequestEvent2 = ({
    result: result2,
    cacheStatus,
    overrideStartTime
  }) => {
    globalThis.__H2O_LOG_EVENT?.({
      ...mergeDebugInfo(),
      eventType: "subrequest",
      startTime: overrideStartTime || startTime,
      endTime: Date.now(),
      cacheStatus,
      responsePayload: result2 && result2[0] || result2,
      responseInit: result2 && result2[1] || userDebugInfo?.responseInit,
      cache: {
        status: cacheStatus,
        strategy: generateCacheControlHeader(strategy || {}),
        key
      },
      waitUntil
    });
  } ;
  if (!cacheInstance || !strategy || strategy.mode === NO_STORE) {
    const result2 = await actionFn({ addDebugData });
    logSubRequestEvent2?.({ result: result2 });
    return result2;
  }
  const storeInCache = (value) => setItemInCache(
    cacheInstance,
    key,
    {
      value,
      debugInfo: mergeDebugInfo() 
    },
    strategy
  );
  const cachedItem = await getItemFromCache(cacheInstance, key);
  if (cachedItem && typeof cachedItem[0] !== "string") {
    const [{ value: cachedResult, debugInfo: debugInfo2 }, cacheInfo] = cachedItem;
    cachedDebugInfo = debugInfo2;
    const cacheStatus = isStale2(key, cacheInfo) ? "STALE" : "HIT";
    if (!swrLock.has(key) && cacheStatus === "STALE") {
      swrLock.add(key);
      const revalidatingPromise = Promise.resolve().then(async () => {
        const revalidateStartTime = Date.now();
        try {
          const result2 = await actionFn({ addDebugData });
          if (shouldCacheResult(result2)) {
            await storeInCache(result2);
            logSubRequestEvent2?.({
              result: result2,
              cacheStatus: "PUT",
              overrideStartTime: revalidateStartTime
            });
          }
        } catch (error) {
          if (error.message) {
            error.message = "SWR in sub-request failed: " + error.message;
          }
          console.error(error);
        } finally {
          swrLock.delete(key);
        }
      });
      waitUntil?.(revalidatingPromise);
    }
    logSubRequestEvent2?.({
      result: cachedResult,
      cacheStatus
    });
    return cachedResult;
  }
  const result = await actionFn({ addDebugData });
  logSubRequestEvent2?.({
    result,
    cacheStatus: "MISS"
  });
  if (shouldCacheResult(result)) {
    const cacheStoringPromise = Promise.resolve().then(async () => {
      const putStartTime = Date.now();
      await storeInCache(result);
      logSubRequestEvent2?.({
        result,
        cacheStatus: "PUT",
        overrideStartTime: putStartTime
      });
    });
    waitUntil?.(cacheStoringPromise);
  }
  return result;
}
function toSerializableResponse(body, response) {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries())
    }
  ];
}
function fromSerializableResponse([body, init]) {
  return [body, new Response(body, init)];
}
async function fetchWithServerCache(url, requestInit, {
  cacheInstance,
  cache: cacheOptions,
  cacheKey = [url, requestInit],
  shouldCacheResponse,
  waitUntil,
  debugInfo,
  streamConfig
}) {
  if (!cacheOptions && (!requestInit.method || requestInit.method === "GET")) {
    cacheOptions = CacheShort();
  }
  return runWithCache(
    cacheKey,
    async () => {
      if (streamConfig) {
        let rawResponse = null;
        const client = createGraphQLClient({
          url,
          customFetchApi: async (url2, options) => {
            rawResponse = await fetch(url2, options);
            return rawResponse;
          },
          headers: requestInit.headers
        });
        const responseStream = await client.requestStream(streamConfig.query, {
          variables: streamConfig.variables
        });
        let allData;
        let allErrors;
        for await (const response2 of responseStream) {
          const { data: data2, errors: errors2 } = response2;
          allData = data2;
          allErrors = errors2?.graphQLErrors ?? errors2;
        }
        if (!rawResponse?.ok) {
          return rawResponse;
        }
        return toSerializableResponse(
          { data: allData, errors: allErrors },
          rawResponse
        );
      }
      const response = await fetch(url, requestInit);
      if (!response.ok) {
        return response;
      }
      let data = await response.text().catch(() => "");
      try {
        if (data) data = parseJSON(data);
      } catch {
      }
      return toSerializableResponse(data, response);
    },
    {
      cacheInstance,
      waitUntil,
      strategy: cacheOptions ?? null,
      debugInfo,
      shouldCacheResult: (payload) => {
        return "ok" in payload ? false : shouldCacheResponse(...fromSerializableResponse(payload));
      }
    }
  ).then((payload) => {
    return "ok" in payload ? [null, payload] : fromSerializableResponse(payload);
  });
}

// src/cache/create-with-cache.ts
function createWithCache(cacheOptions) {
  const { cache, waitUntil, request } = cacheOptions;
  return {
    run: ({ cacheKey, cacheStrategy, shouldCacheResult }, fn) => {
      return runWithCache(cacheKey, fn, {
        shouldCacheResult,
        strategy: cacheStrategy,
        cacheInstance: cache,
        waitUntil,
        debugInfo: {
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.()
        }
      });
    },
    fetch: (url, requestInit, options) => {
      return fetchWithServerCache(url, requestInit ?? {}, {
        waitUntil,
        cacheKey: [url, requestInit],
        cacheInstance: cache,
        debugInfo: {
          url,
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.(),
          displayName: options?.displayName
        },
        cache: options.cacheStrategy,
        ...options
      }).then(([data, response]) => ({ data, response }));
    }
  };
}

// src/cache/in-memory.ts
var InMemoryCache = class {
  #store;
  constructor() {
    this.#store = /* @__PURE__ */ new Map();
  }
  add(request) {
    throw new Error("Method not implemented. Use `put` instead.");
  }
  addAll(requests) {
    throw new Error("Method not implemented. Use `put` instead.");
  }
  matchAll(request, options) {
    throw new Error("Method not implemented. Use `match` instead.");
  }
  async put(request, response) {
    if (request.method !== "GET") {
      throw new TypeError("Cannot cache response to non-GET request.");
    }
    if (response.status === 206) {
      throw new TypeError(
        "Cannot cache response to a range request (206 Partial Content)."
      );
    }
    if (response.headers.get("vary")?.includes("*")) {
      throw new TypeError("Cannot cache response with 'Vary: *' header.");
    }
    this.#store.set(request.url, {
      body: new Uint8Array(await response.arrayBuffer()),
      status: response.status,
      headers: [...response.headers],
      timestamp: Date.now()
    });
  }
  async match(request) {
    if (request.method !== "GET") return;
    const match = this.#store.get(request.url);
    if (!match) {
      return;
    }
    const { body, timestamp, ...metadata } = match;
    const headers = new Headers(metadata.headers);
    const cacheControl = headers.get("cache-control") || headers.get("real-cache-control") || "";
    const maxAge = parseInt(
      cacheControl.match(/max-age=(\d+)/)?.[1] || "0",
      10
    );
    const swr = parseInt(
      cacheControl.match(/stale-while-revalidate=(\d+)/)?.[1] || "0",
      10
    );
    const age = (Date.now() - timestamp) / 1e3;
    const isMiss = age > maxAge + swr;
    if (isMiss) {
      this.#store.delete(request.url);
      return;
    }
    const isStale3 = age > maxAge;
    headers.set("cache", isStale3 ? "STALE" : "HIT");
    headers.set("date", new Date(timestamp).toUTCString());
    return new Response(body, {
      status: metadata.status ?? 200,
      headers
    });
  }
  async delete(request) {
    if (this.#store.has(request.url)) {
      this.#store.delete(request.url);
      return true;
    }
    return false;
  }
  keys(request) {
    const cacheKeys = [];
    for (const url of this.#store.keys()) {
      if (!request || request.url === url) {
        cacheKeys.push(new Request(url));
      }
    }
    return Promise.resolve(cacheKeys);
  }
};
var INPUT_NAME = "cartFormInput";
function CartForm({
  children,
  action,
  inputs,
  route,
  fetcherKey
}) {
  const fetcher = useFetcher({ key: fetcherKey });
  return /* @__PURE__ */ jsxs(fetcher.Form, { action: route || "", method: "post", children: [
    (action || inputs) && /* @__PURE__ */ jsx(
      "input",
      {
        type: "hidden",
        name: INPUT_NAME,
        value: JSON.stringify({ action, inputs })
      }
    ),
    typeof children === "function" ? children(fetcher) : children
  ] });
}
CartForm.INPUT_NAME = INPUT_NAME;
CartForm.ACTIONS = {
  AttributesUpdateInput: "AttributesUpdateInput",
  BuyerIdentityUpdate: "BuyerIdentityUpdate",
  Create: "Create",
  DiscountCodesUpdate: "DiscountCodesUpdate",
  GiftCardCodesUpdate: "GiftCardCodesUpdate",
  GiftCardCodesRemove: "GiftCardCodesRemove",
  LinesAdd: "LinesAdd",
  LinesRemove: "LinesRemove",
  LinesUpdate: "LinesUpdate",
  NoteUpdate: "NoteUpdate",
  SelectedDeliveryOptionsUpdate: "SelectedDeliveryOptionsUpdate",
  MetafieldsSet: "MetafieldsSet",
  MetafieldDelete: "MetafieldDelete",
  DeliveryAddressesAdd: "DeliveryAddressesAdd",
  DeliveryAddressesUpdate: "DeliveryAddressesUpdate",
  DeliveryAddressesRemove: "DeliveryAddressesRemove"
};
function getFormInput(formData) {
  const data = {};
  for (const pair of formData.entries()) {
    const key = pair[0];
    const values = formData.getAll(key);
    data[key] = values.length > 1 ? values : pair[1];
    if (data[key] === "on") {
      data[key] = true;
    } else if (data[key] === "off") {
      data[key] = false;
    }
  }
  const { cartFormInput, ...otherData } = data;
  const { action, inputs } = cartFormInput ? JSON.parse(String(cartFormInput)) : {};
  return {
    action,
    inputs: {
      ...inputs,
      ...otherData
    }
  };
}
CartForm.getFormInput = getFormInput;
var cartGetIdDefault = (requestHeaders) => {
  const cookies = parse(getHeaderValue(requestHeaders, "Cookie") || "");
  return () => {
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : void 0;
  };
};
var cartSetIdDefault = (cookieOptions) => {
  return (cartId) => {
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      stringify("cart", cartId.split("/").pop() || "", {
        path: "/",
        ...cookieOptions
      })
    );
    return headers;
  };
};

// src/constants.ts
var STOREFRONT_REQUEST_GROUP_ID_HEADER = "Custom-Storefront-Request-Group-ID";
var STOREFRONT_ACCESS_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
var SDK_VARIANT_HEADER = "X-SDK-Variant";
var SDK_VARIANT_SOURCE_HEADER = "X-SDK-Variant-Source";
var SDK_VERSION_HEADER = "X-SDK-Version";

// src/utils/uuid.ts
function generateUUID() {
  if (typeof crypto !== "undefined" && !!crypto.randomUUID) {
    return crypto.randomUUID();
  } else {
    return `weak-${Math.random().toString(16).substring(2)}`;
  }
}

// src/version.ts
var LIB_VERSION = "2025.7.0";

// src/utils/graphql.ts
function minifyQuery(string) {
  return string.replace(/\s*#.*$/gm, "").replace(/\s+/gm, " ").trim();
}
var IS_QUERY_RE = /(^|}\s)query[\s({]/im;
var IS_MUTATION_RE = /(^|}\s)mutation[\s({]/im;
function assertQuery(query, callerName) {
  if (!IS_QUERY_RE.test(query)) {
    throw new Error(`[h2:error:${callerName}] Can only execute queries`);
  }
}
function assertMutation(query, callerName) {
  if (!IS_MUTATION_RE.test(query)) {
    throw new Error(`[h2:error:${callerName}] Can only execute mutations`);
  }
}
var GraphQLError = class extends Error {
  /**
   * If an error can be associated to a particular point in the requested
   * GraphQL document, it should contain a list of locations.
   */
  locations;
  /**
   * If an error can be associated to a particular field in the GraphQL result,
   * it _must_ contain an entry with the key `path` that details the path of
   * the response field which experienced the error. This allows clients to
   * identify whether a null result is intentional or caused by a runtime error.
   */
  path;
  /**
   * Reserved for implementors to extend the protocol however they see fit,
   * and hence there are no additional restrictions on its contents.
   */
  extensions;
  constructor(message, options = {}) {
    const h2Prefix = options.clientOperation ? `[h2:error:${options.clientOperation}] ` : "";
    const enhancedMessage = h2Prefix + message + (options.requestId ? ` - Request ID: ${options.requestId}` : "");
    super(enhancedMessage);
    this.name = "GraphQLError";
    this.extensions = options.extensions;
    this.locations = options.locations;
    this.path = options.path;
    this.stack = options.stack || void 0;
    try {
      this.cause = JSON.stringify({
        ...typeof options.cause === "object" ? options.cause : {},
        requestId: options.requestId,
        ...{
          path: options.path,
          extensions: options.extensions,
          graphql: h2Prefix && options.query && {
            query: options.query,
            variables: JSON.stringify(options.queryVariables)
          }
        }
      });
    } catch {
      if (options.cause) this.cause = options.cause;
    }
  }
  get [Symbol.toStringTag]() {
    return this.name;
  }
  /**
   * Note: `toString()` is internally used by `console.log(...)` / `console.error(...)`
   * when ingesting logs in Oxygen production. Therefore, we want to make sure that
   * the error message is as informative as possible instead of `[object Object]`.
   */
  toString() {
    let result = `${this.name}: ${this.message}`;
    if (this.path) {
      try {
        result += ` | path: ${JSON.stringify(this.path)}`;
      } catch {
      }
    }
    if (this.extensions) {
      try {
        result += ` | extensions: ${JSON.stringify(this.extensions)}`;
      } catch {
      }
    }
    result += "\n";
    if (this.stack) {
      result += `${this.stack.slice(this.stack.indexOf("\n") + 1)}
`;
    }
    return result;
  }
  /**
   * Note: toJSON` is internally used by `JSON.stringify(...)`.
   * The most common scenario when this error instance is going to be stringified is
   * when it's passed to Remix' `json` and `defer` functions: e.g. `{promise: storefront.query(...)}`.
   * In this situation, we don't want to expose private error information to the browser so we only
   * do it in development.
   */
  toJSON() {
    const formatted = { name: "Error", message: "" };
    {
      formatted.name = this.name;
      formatted.message = "Development: " + this.message;
      if (this.path) formatted.path = this.path;
      if (this.locations) formatted.locations = this.locations;
      if (this.extensions) formatted.extensions = this.extensions;
    }
    return formatted;
  }
};
function throwErrorWithGqlLink({
  url,
  response,
  errors: errors2,
  type,
  query,
  queryVariables,
  ErrorConstructor = Error,
  client = "storefront"
}) {
  const errorMessage = (typeof errors2 === "string" ? errors2 : errors2?.map?.((error) => error.message).join("\n")) || `URL: ${url}
API response error: ${response.status}`;
  const gqlError = new GraphQLError(errorMessage, {
    query,
    queryVariables,
    cause: { errors: errors2 },
    clientOperation: `${client}.${type}`,
    requestId: response.headers.get("x-request-id")
  });
  throw new ErrorConstructor(gqlError.message, { cause: gqlError.cause });
}

// src/storefront.ts
var defaultI18n = {
  language: "EN",
  country: "US"
};
function createStorefrontClient(options) {
  const {
    storefrontHeaders,
    cache,
    waitUntil,
    i18n,
    storefrontId,
    logErrors = true,
    ...clientOptions
  } = options;
  const H2_PREFIX_WARN = "[h2:warn:createStorefrontClient] ";
  if (!cache) {
    warnOnce(
      H2_PREFIX_WARN + "Storefront API client created without a cache instance. This may slow down your sub-requests."
    );
  }
  const {
    getPublicTokenHeaders,
    getPrivateTokenHeaders,
    getStorefrontApiUrl,
    getShopifyDomain
  } = createStorefrontClient$1(clientOptions);
  const getHeaders = clientOptions.privateStorefrontToken ? getPrivateTokenHeaders : getPublicTokenHeaders;
  const defaultHeaders = getHeaders({
    contentType: "json",
    buyerIp: storefrontHeaders?.buyerIp || ""
  });
  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] = storefrontHeaders?.requestGroupId || generateUUID();
  if (storefrontId) defaultHeaders[SHOPIFY_STOREFRONT_ID_HEADER] = storefrontId;
  defaultHeaders["user-agent"] = `Hydrogen ${LIB_VERSION}`;
  if (storefrontHeaders && storefrontHeaders.cookie) {
    const cookies = getShopifyCookies(storefrontHeaders.cookie ?? "");
    if (cookies[SHOPIFY_Y])
      defaultHeaders[SHOPIFY_STOREFRONT_Y_HEADER] = cookies[SHOPIFY_Y];
    if (cookies[SHOPIFY_S])
      defaultHeaders[SHOPIFY_STOREFRONT_S_HEADER] = cookies[SHOPIFY_S];
  }
  const cacheKeyHeader = JSON.stringify({
    "content-type": defaultHeaders["content-type"],
    "user-agent": defaultHeaders["user-agent"],
    [SDK_VARIANT_HEADER]: defaultHeaders[SDK_VARIANT_HEADER],
    [SDK_VARIANT_SOURCE_HEADER]: defaultHeaders[SDK_VARIANT_SOURCE_HEADER],
    [SDK_VERSION_HEADER]: defaultHeaders[SDK_VERSION_HEADER],
    [STOREFRONT_ACCESS_TOKEN_HEADER]: defaultHeaders[STOREFRONT_ACCESS_TOKEN_HEADER]
  });
  async function fetchStorefrontApi({
    query,
    mutation,
    variables,
    cache: cacheOptions,
    headers = [],
    storefrontApiVersion,
    displayName,
    stackInfo
  }) {
    const userHeaders = headers instanceof Headers ? Object.fromEntries(headers.entries()) : Array.isArray(headers) ? Object.fromEntries(headers) : headers;
    const document2 = query ?? mutation;
    const queryVariables = { ...variables };
    if (i18n) {
      if (!variables?.country && /\$country/.test(document2)) {
        queryVariables.country = i18n.country;
      }
      if (!variables?.language && /\$language/.test(document2)) {
        queryVariables.language = i18n.language;
      }
    }
    const url = getStorefrontApiUrl({ storefrontApiVersion });
    const graphqlData = JSON.stringify({
      query: document2,
      variables: queryVariables
    });
    const requestInit = {
      method: "POST",
      headers: { ...defaultHeaders, ...userHeaders },
      body: graphqlData
    };
    const cacheKey = [
      url,
      requestInit.method,
      cacheKeyHeader,
      requestInit.body
    ];
    const streamConfig = document2.includes("@defer") ? {
      query: document2,
      variables: queryVariables
    } : void 0;
    const [body, response] = await fetchWithServerCache(url, requestInit, {
      cacheInstance: mutation ? void 0 : cache,
      cache: cacheOptions || CacheDefault(),
      cacheKey,
      waitUntil,
      // Check if the response body has GraphQL errors:
      // https://spec.graphql.org/June2018/#sec-Response-Format
      shouldCacheResponse: (body2) => !body2?.errors,
      // Optional information for the subrequest profiler:
      debugInfo: {
        requestId: requestInit.headers[STOREFRONT_REQUEST_GROUP_ID_HEADER],
        displayName,
        url,
        stackInfo,
        graphql: graphqlData,
        purpose: storefrontHeaders?.purpose
      },
      streamConfig
    });
    const errorOptions = {
      url,
      response,
      type: mutation ? "mutation" : "query",
      query: document2,
      queryVariables,
      errors: void 0
    };
    if (!response.ok) {
      let errors3;
      let bodyText = body;
      try {
        bodyText ??= await response.text();
        errors3 = parseJSON(bodyText);
      } catch (_e) {
        errors3 = [
          { message: bodyText ?? "Could not parse Storefront API response" }
        ];
      }
      throwErrorWithGqlLink({ ...errorOptions, errors: errors3 });
    }
    let { data, errors: errors2 } = body;
    errors2 = errors2 ? Array.isArray(errors2) ? errors2 : [errors2] : void 0;
    const gqlErrors = errors2?.map(
      ({ message, ...rest }) => new GraphQLError(message, {
        ...rest,
        clientOperation: `storefront.${errorOptions.type}`,
        requestId: response.headers.get("x-request-id"),
        queryVariables,
        query: document2
      })
    );
    return formatAPIResult(data, gqlErrors);
  }
  return {
    storefront: {
      /**
       * Sends a GraphQL query to the Storefront API.
       *
       * Example:
       *
       * ```js
       * async function loader ({context: {storefront}}) {
       *   const data = await storefront.query('query { ... }', {
       *     variables: {},
       *     cache: storefront.CacheLong()
       *   });
       * }
       * ```
       */
      query(query, options2) {
        query = minifyQuery(query);
        assertQuery(query, "storefront.query");
        const stackOffset = getStackOffset?.(query);
        return withSyncStack(
          fetchStorefrontApi({
            ...options2,
            query,
            stackInfo: getCallerStackLine?.(stackOffset)
          }),
          { stackOffset, logErrors }
        );
      },
      /**
       * Sends a GraphQL mutation to the Storefront API.
       *
       * Example:
       *
       * ```js
       * async function loader ({context: {storefront}}) {
       *   await storefront.mutate('mutation { ... }', {
       *     variables: {},
       *   });
       * }
       * ```
       */
      mutate(mutation, options2) {
        mutation = minifyQuery(mutation);
        assertMutation(mutation, "storefront.mutate");
        const stackOffset = getStackOffset?.(mutation);
        return withSyncStack(
          fetchStorefrontApi({
            ...options2,
            mutation,
            stackInfo: getCallerStackLine?.(stackOffset)
          }),
          { stackOffset, logErrors }
        );
      },
      cache,
      CacheNone,
      CacheLong,
      CacheShort,
      CacheCustom,
      generateCacheControlHeader,
      getPublicTokenHeaders,
      getPrivateTokenHeaders,
      getShopifyDomain,
      getApiUrl: getStorefrontApiUrl,
      i18n: i18n ?? defaultI18n
    }
  };
}
var getStackOffset = (query) => {
  let stackOffset = 0;
  if (/fragment CartApi(Query|Mutation) on Cart/.test(query)) {
    stackOffset = 1;
  }
  return stackOffset;
} ;
function formatAPIResult(data, errors2) {
  return {
    ...data,
    ...errors2 && { errors: errors2 }
  };
}

// src/cart/queries/cartGetDefault.ts
function cartGetDefault({
  storefront,
  customerAccount,
  getCartId,
  cartFragment
}) {
  return async (cartInput) => {
    const cartId = getCartId();
    if (!cartId) return null;
    const [isCustomerLoggedIn, { cart, errors: errors2 }] = await Promise.all([
      customerAccount ? customerAccount.isLoggedIn() : false,
      storefront.query(CART_QUERY(cartFragment), {
        variables: { cartId, ...cartInput },
        cache: storefront.CacheNone()
      })
    ]);
    if (isCustomerLoggedIn && cart?.checkoutUrl) {
      const finalCheckoutUrl = new URL(cart.checkoutUrl);
      finalCheckoutUrl.searchParams.set("logged_in", "true");
      cart.checkoutUrl = finalCheckoutUrl.toString();
    }
    return cart || errors2 ? formatAPIResult(cart, errors2) : null;
  };
}
var CART_QUERY = (cartFragment = DEFAULT_CART_FRAGMENT) => `#graphql
  query CartQuery(
    $cartId: ID!
    $numCartLines: Int = 100
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cart(id: $cartId) {
      ...CartApiQuery
    }
  }

  ${cartFragment}
`;
var DEFAULT_CART_FRAGMENT = `#graphql
  fragment CartApiQuery on Cart {
    updatedAt
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...CartApiMoney
              }
              price {
                ...CartApiMoney
              }
              requiresShipping
              title
              image {
                ...CartApiImage
              }
              product {
                handle
                title
                id
                vendor
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...CartApiMoney
      }
      totalAmount {
        ...CartApiMoney
      }
      totalDutyAmount {
        ...CartApiMoney
      }
      totalTaxAmount {
        ...CartApiMoney
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      applicable
      code
    }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        ...CartApiMoney
      }
    }
  }

  fragment CartApiMoney on MoneyV2 {
    currencyCode
    amount
  }

  fragment CartApiImage on Image {
    id
    url
    altText
    width
    height
  }
`;

// src/cart/queries/cart-fragments.ts
var USER_ERROR_FRAGMENT = `#graphql
  fragment CartApiError on CartUserError {
    message
    field
    code
  }
`;
var MINIMAL_CART_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    id
    totalQuantity
    checkoutUrl
  }
`;
var CART_WARNING_FRAGMENT = `#graphql
  fragment CartApiWarning on CartWarning {
    code
    message
    target
  }
`;

// src/cart/queries/cartCreateDefault.ts
function cartCreateDefault(options) {
  return async (input, optionalParams) => {
    const buyer = options.customerAccount ? await options.customerAccount.getBuyer() : void 0;
    const { cartId, ...restOfOptionalParams } = optionalParams || {};
    const { buyerIdentity, ...restOfInput } = input;
    const { cartCreate, errors: errors2 } = await options.storefront.mutate(CART_CREATE_MUTATION(options.cartFragment), {
      variables: {
        input: {
          ...restOfInput,
          buyerIdentity: {
            ...buyer,
            ...buyerIdentity
          }
        },
        ...restOfOptionalParams
      }
    });
    return formatAPIResult(cartCreate, errors2);
  };
}
var CART_CREATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartCreate(
    $input: CartInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartApiMutation
        checkoutUrl
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartLinesAddDefault.ts
function cartLinesAddDefault(options) {
  return async (lines, optionalParams) => {
    const { cartLinesAdd, errors: errors2 } = await options.storefront.mutate(CART_LINES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams
      }
    });
    return formatAPIResult(cartLinesAdd, errors2);
  };
}
var CART_LINES_ADD_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/optimistic/optimistic-cart.helper.ts
var PENDING_PREFIX = "__h_pending_";
function getOptimisticLineId(variantId) {
  return PENDING_PREFIX + variantId;
}
function isOptimisticLineId(lineId) {
  return lineId.startsWith(PENDING_PREFIX);
}
function throwIfLinesAreOptimistic(type, lines) {
  if (lines.some(
    (line) => isOptimisticLineId(typeof line === "string" ? line : line.id)
  )) {
    throw new Error(
      `Tried to perform an action on an optimistic line. Make sure to disable your "${type}" CartForm action when the line is optimistic.`
    );
  }
}

// src/cart/queries/cartLinesUpdateDefault.ts
function cartLinesUpdateDefault(options) {
  return async (lines, optionalParams) => {
    throwIfLinesAreOptimistic("updateLines", lines);
    const { cartLinesUpdate, errors: errors2 } = await options.storefront.mutate(CART_LINES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams
      }
    });
    return formatAPIResult(cartLinesUpdate, errors2);
  };
}
var CART_LINES_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartLinesRemoveDefault.ts
function cartLinesRemoveDefault(options) {
  return async (lineIds, optionalParams) => {
    throwIfLinesAreOptimistic("removeLines", lineIds);
    const { cartLinesRemove, errors: errors2 } = await options.storefront.mutate(CART_LINES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lineIds,
        ...optionalParams
      }
    });
    return formatAPIResult(cartLinesRemove, errors2);
  };
}
var CART_LINES_REMOVE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartDiscountCodesUpdateDefault.ts
function cartDiscountCodesUpdateDefault(options) {
  return async (discountCodes, optionalParams) => {
    const uniqueCodes = discountCodes.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });
    const { cartDiscountCodesUpdate, errors: errors2 } = await options.storefront.mutate(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        discountCodes: uniqueCodes,
        ...optionalParams
      }
    });
    return formatAPIResult(cartDiscountCodesUpdate, errors2);
  };
}
var CART_DISCOUNT_CODE_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      ... @defer {
        cart {
          ...CartApiMutation
        }
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartBuyerIdentityUpdateDefault.ts
function cartBuyerIdentityUpdateDefault(options) {
  return async (buyerIdentity, optionalParams) => {
    if (buyerIdentity.companyLocationId && options.customerAccount) {
      options.customerAccount.setBuyer({
        companyLocationId: buyerIdentity.companyLocationId
      });
    }
    const buyer = options.customerAccount ? await options.customerAccount.getBuyer() : void 0;
    const { cartBuyerIdentityUpdate, errors: errors2 } = await options.storefront.mutate(CART_BUYER_IDENTITY_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        buyerIdentity: {
          ...buyer,
          ...buyerIdentity
        },
        ...optionalParams
      }
    });
    return formatAPIResult(cartBuyerIdentityUpdate, errors2);
  };
}
var CART_BUYER_IDENTITY_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartNoteUpdateDefault.ts
function cartNoteUpdateDefault(options) {
  return async (note, optionalParams) => {
    const { cartNoteUpdate, errors: errors2 } = await options.storefront.mutate(CART_NOTE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        note,
        ...optionalParams
      }
    });
    return formatAPIResult(cartNoteUpdate, errors2);
  };
}
var CART_NOTE_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts
function cartSelectedDeliveryOptionsUpdateDefault(options) {
  return async (selectedDeliveryOptions, optionalParams) => {
    const { cartSelectedDeliveryOptionsUpdate, errors: errors2 } = await options.storefront.mutate(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        selectedDeliveryOptions,
        ...optionalParams
      }
    });
    return formatAPIResult(cartSelectedDeliveryOptionsUpdate, errors2);
  };
}
var CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartAttributesUpdateDefault.ts
function cartAttributesUpdateDefault(options) {
  return async (attributes, optionalParams) => {
    const { cartAttributesUpdate, errors: errors2 } = await options.storefront.mutate(CART_ATTRIBUTES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: optionalParams?.cartId || options.getCartId(),
        attributes
      }
    });
    return formatAPIResult(cartAttributesUpdate, errors2);
  };
}
var CART_ATTRIBUTES_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartAttributesUpdate(
    $cartId: ID!
    $attributes: [AttributeInput!]!
  ) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartMetafieldsSetDefault.ts
function cartMetafieldsSetDefault(options) {
  return async (metafields, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const metafieldsWithOwnerId = metafields.map(
      (metafield) => ({
        ...metafield,
        ownerId
      })
    );
    const { cartMetafieldsSet, errors: errors2 } = await options.storefront.mutate(CART_METAFIELD_SET_MUTATION(), {
      variables: { metafields: metafieldsWithOwnerId }
    });
    return formatAPIResult(
      {
        cart: {
          id: ownerId
        },
        ...cartMetafieldsSet
      },
      errors2
    );
  };
}
var CART_METAFIELD_SET_MUTATION = () => `#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldsSet(metafields: $metafields) {
      userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`;

// src/cart/queries/cartMetafieldDeleteDefault.ts
function cartMetafieldDeleteDefault(options) {
  return async (key, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const { cartMetafieldDelete, errors: errors2 } = await options.storefront.mutate(CART_METAFIELD_DELETE_MUTATION(), {
      variables: {
        input: {
          ownerId,
          key
        }
      }
    });
    return formatAPIResult(
      {
        cart: {
          id: ownerId
        },
        ...cartMetafieldDelete
      },
      errors2
    );
  };
}
var CART_METAFIELD_DELETE_MUTATION = () => `#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
  ) {
    cartMetafieldDelete(input: $input) {
      userErrors {
        code
        field
        message
      }
    }
  }
`;

// src/cart/queries/cartGiftCardCodeUpdateDefault.ts
function cartGiftCardCodesUpdateDefault(options) {
  return async (giftCardCodes, optionalParams) => {
    const uniqueCodes = giftCardCodes.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });
    const { cartGiftCardCodesUpdate, errors: errors2 } = await options.storefront.mutate(CART_GIFT_CARD_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        giftCardCodes: uniqueCodes,
        ...optionalParams
      }
    });
    return formatAPIResult(cartGiftCardCodesUpdate, errors2);
  };
}
var CART_GIFT_CARD_CODE_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartGiftCardCodesUpdate(
    $cartId: ID!
    $giftCardCodes: [String!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartGiftCardCodesRemoveDefault.ts
function cartGiftCardCodesRemoveDefault(options) {
  return async (appliedGiftCardIds, optionalParams) => {
    const { cartGiftCardCodesRemove, errors: errors2 } = await options.storefront.mutate(CART_GIFT_CARD_CODES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        appliedGiftCardIds,
        ...optionalParams
      }
    });
    return formatAPIResult(cartGiftCardCodesRemove, errors2);
  };
}
var CART_GIFT_CARD_CODES_REMOVE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartGiftCardCodesRemove(
    $cartId: ID!
    $appliedGiftCardIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartDeliveryAddressesAddDefault.tsx
function cartDeliveryAddressesAddDefault(options) {
  return async (addresses, optionalParams) => {
    const { cartDeliveryAddressesAdd, errors: errors2 } = await options.storefront.mutate(CART_DELIVERY_ADDRESSES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        addresses,
        ...optionalParams
      }
    });
    return formatAPIResult(cartDeliveryAddressesAdd, errors2);
  };
}
var CART_DELIVERY_ADDRESSES_ADD_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartDeliveryAddressesAdd(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesAdd(addresses: $addresses, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartDeliveryAddressesRemoveDefault.tsx
function cartDeliveryAddressesRemoveDefault(options) {
  return async (addressIds, optionalParams) => {
    const { cartDeliveryAddressesRemove, errors: errors2 } = await options.storefront.mutate(CART_DELIVERY_ADDRESSES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        addressIds,
        ...optionalParams
      }
    });
    return formatAPIResult(cartDeliveryAddressesRemove, errors2);
  };
}
var CART_DELIVERY_ADDRESSES_REMOVE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartDeliveryAddressesRemove(
    $cartId: ID!
    $addressIds: [ID!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesRemove(addressIds: $addressIds, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/queries/cartDeliveryAddressesUpdateDefault.tsx
function cartDeliveryAddressesUpdateDefault(options) {
  return async (addresses, optionalParams) => {
    const { cartDeliveryAddressesUpdate, errors: errors2 } = await options.storefront.mutate(CART_DELIVERY_ADDRESSES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        addresses,
        ...optionalParams
      }
    });
    return formatAPIResult(cartDeliveryAddressesUpdate, errors2);
  };
}
var CART_DELIVERY_ADDRESSES_UPDATE_MUTATION = (cartFragment = MINIMAL_CART_FRAGMENT) => `#graphql
  mutation cartDeliveryAddressesUpdate(
    $cartId: ID!
    $addresses: [CartSelectableAddressUpdateInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesUpdate(addresses: $addresses, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;

// src/cart/createCartHandler.ts
function createCartHandler(options) {
  const {
    getCartId: _getCartId,
    setCartId,
    storefront,
    customerAccount,
    cartQueryFragment,
    cartMutateFragment,
    buyerIdentity
  } = options;
  let cartId = _getCartId();
  const getCartId = () => cartId || _getCartId();
  const mutateOptions = {
    storefront,
    getCartId,
    cartFragment: cartMutateFragment,
    customerAccount
  };
  const _cartCreate = cartCreateDefault(mutateOptions);
  const cartCreate = async function(...args) {
    args[0].buyerIdentity = {
      ...buyerIdentity,
      ...args[0].buyerIdentity
    };
    const result = await _cartCreate(...args);
    cartId = result?.cart?.id;
    return result;
  };
  const methods = {
    get: cartGetDefault({
      storefront,
      customerAccount,
      getCartId,
      cartFragment: cartQueryFragment
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLines: async (linesWithOptimisticData, optionalParams) => {
      const lines = linesWithOptimisticData.map((line) => {
        return {
          attributes: line.attributes,
          quantity: line.quantity,
          merchandiseId: line.merchandiseId,
          sellingPlanId: line.sellingPlanId
        };
      });
      return cartId || optionalParams?.cartId ? await cartLinesAddDefault(mutateOptions)(lines, optionalParams) : await cartCreate({ lines, buyerIdentity }, optionalParams);
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (discountCodes, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartDiscountCodesUpdateDefault(mutateOptions)(
        discountCodes,
        optionalParams
      ) : await cartCreate({ discountCodes }, optionalParams);
    },
    updateGiftCardCodes: async (giftCardCodes, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartGiftCardCodesUpdateDefault(mutateOptions)(
        giftCardCodes,
        optionalParams
      ) : await cartCreate({ giftCardCodes }, optionalParams);
    },
    removeGiftCardCodes: cartGiftCardCodesRemoveDefault(mutateOptions),
    updateBuyerIdentity: async (buyerIdentity2, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartBuyerIdentityUpdateDefault(mutateOptions)(
        buyerIdentity2,
        optionalParams
      ) : await cartCreate({ buyerIdentity: buyerIdentity2 }, optionalParams);
    },
    updateNote: async (note, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartNoteUpdateDefault(mutateOptions)(note, optionalParams) : await cartCreate({ note }, optionalParams);
    },
    updateSelectedDeliveryOption: cartSelectedDeliveryOptionsUpdateDefault(mutateOptions),
    updateAttributes: async (attributes, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartAttributesUpdateDefault(mutateOptions)(
        attributes,
        optionalParams
      ) : await cartCreate({ attributes }, optionalParams);
    },
    setMetafields: async (metafields, optionalParams) => {
      return cartId || optionalParams?.cartId ? await cartMetafieldsSetDefault(mutateOptions)(
        metafields,
        optionalParams
      ) : await cartCreate({ metafields }, optionalParams);
    },
    deleteMetafield: cartMetafieldDeleteDefault(mutateOptions),
    addDeliveryAddresses: cartDeliveryAddressesAddDefault(mutateOptions),
    removeDeliveryAddresses: cartDeliveryAddressesRemoveDefault(mutateOptions),
    updateDeliveryAddresses: cartDeliveryAddressesUpdateDefault(mutateOptions)
  };
  if ("customMethods" in options) {
    return {
      ...methods,
      ...options.customMethods ?? {}
    };
  } else {
    return methods;
  }
}
function useOptimisticCart(cart) {
  const fetchers = useFetchers();
  if (!fetchers || !fetchers.length) return cart;
  const optimisticCart = cart?.lines ? structuredClone(cart) : { lines: { nodes: [] } };
  const cartLines = optimisticCart.lines.nodes;
  let isOptimistic = false;
  for (const { formData } of fetchers) {
    if (!formData) continue;
    const cartFormData = CartForm.getFormInput(formData);
    if (cartFormData.action === CartForm.ACTIONS.LinesAdd) {
      for (const input of cartFormData.inputs.lines) {
        if (!input.selectedVariant) {
          console.error(
            "[h2:error:useOptimisticCart] No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart"
          );
          continue;
        }
        const existingLine = cartLines.find(
          (line) => line.merchandise.id === input.selectedVariant?.id
        );
        isOptimistic = true;
        if (existingLine) {
          existingLine.quantity = (existingLine.quantity || 1) + (input.quantity || 1);
          existingLine.isOptimistic = true;
        } else {
          cartLines.unshift({
            id: getOptimisticLineId(input.selectedVariant.id),
            merchandise: input.selectedVariant,
            isOptimistic: true,
            quantity: input.quantity || 1
          });
        }
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesRemove) {
      for (const lineId of cartFormData.inputs.lineIds) {
        const index = cartLines.findIndex((line) => line.id === lineId);
        if (index !== -1) {
          if (isOptimisticLineId(cartLines[index].id)) {
            console.error(
              "[h2:error:useOptimisticCart] Tried to remove an optimistic line that has not been added to the cart yet"
            );
            continue;
          }
          cartLines.splice(index, 1);
          isOptimistic = true;
        } else {
          console.warn(
            `[h2:warn:useOptimisticCart] Tried to remove line '${lineId}' but it doesn't exist in the cart`
          );
        }
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesUpdate) {
      for (const line of cartFormData.inputs.lines) {
        const index = cartLines.findIndex(
          (optimisticLine) => line.id === optimisticLine.id
        );
        if (index > -1) {
          if (isOptimisticLineId(cartLines[index].id)) {
            console.error(
              "[h2:error:useOptimisticCart] Tried to update an optimistic line that has not been added to the cart yet"
            );
            continue;
          }
          cartLines[index].quantity = line.quantity;
          if (cartLines[index].quantity === 0) {
            cartLines.splice(index, 1);
          }
          isOptimistic = true;
        } else {
          console.warn(
            `[h2:warn:useOptimisticCart] Tried to update line '${line.id}' but it doesn't exist in the cart`
          );
        }
      }
    }
  }
  if (isOptimistic) {
    optimisticCart.isOptimistic = isOptimistic;
  }
  optimisticCart.totalQuantity = cartLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );
  return optimisticCart;
}

// src/changelogHandler.ts
var DEFAULT_GITHUB_CHANGELOG_URL = "https://raw.githubusercontent.com/Shopify/hydrogen/main/docs/changelog.json";
async function changelogHandler({
  request,
  changelogUrl
}) {
  new URL(request.url).searchParams;
  const GITHUB_CHANGELOG_URL = changelogUrl || DEFAULT_GITHUB_CHANGELOG_URL;
  return fetch(GITHUB_CHANGELOG_URL);
}
var storefrontContext = createContext$1();
var cartContext = createContext$1();
var customerAccountContext = createContext$1();
var envContext = createContext$1();
var sessionContext = createContext$1();
var waitUntilContext = createContext$1();
var hydrogenContext = {
  storefront: storefrontContext,
  cart: cartContext,
  customerAccount: customerAccountContext,
  env: envContext,
  session: sessionContext,
  waitUntil: waitUntilContext
};

// src/customer/constants.ts
var DEFAULT_CUSTOMER_API_VERSION = "2025-07";
var USER_AGENT = `Shopify Hydrogen ${LIB_VERSION}`;
var CUSTOMER_API_CLIENT_ID = "30243aa5-17c1-465a-8493-944bcc4e88aa";
var CUSTOMER_ACCOUNT_SESSION_KEY = "customerAccount";
var BUYER_SESSION_KEY = "buyer";

// src/customer/BadRequest.ts
var BadRequest = class extends Response {
  constructor(message, helpMessage, headers) {
    if (helpMessage && true) {
      console.error("Customer Account API Error: " + helpMessage);
    }
    super(`Bad request: ${message}`, { status: 400, headers });
  }
};

// src/customer/auth.helpers.ts
var logSubRequestEvent = ({
  url,
  response,
  startTime,
  query,
  variables,
  ...debugInfo
}) => {
  globalThis.__H2O_LOG_EVENT?.({
    ...debugInfo,
    eventType: "subrequest",
    url,
    startTime,
    graphql: query ? JSON.stringify({ query, variables, schema: "customer-account" }) : void 0,
    responseInit: {
      status: response.status || 0,
      statusText: response.statusText || "",
      headers: Array.from(response.headers.entries() || [])
    }
  });
} ;
function redirect(path, options = {}) {
  const headers = options.headers ? new Headers(options.headers) : new Headers({});
  headers.set("location", path);
  return new Response(null, { status: options.status || 302, headers });
}
async function refreshToken({
  session,
  customerAccountId,
  customerAccountTokenExchangeUrl,
  httpsOrigin,
  debugInfo
}) {
  const newBody = new URLSearchParams();
  const customerAccount = session.get(CUSTOMER_ACCOUNT_SESSION_KEY);
  const refreshToken2 = customerAccount?.refreshToken;
  const idToken = customerAccount?.idToken;
  if (!refreshToken2)
    throw new BadRequest(
      "Unauthorized",
      "No refreshToken found in the session. Make sure your session is configured correctly and passed to `createCustomerAccountClient`."
    );
  newBody.append("grant_type", "refresh_token");
  newBody.append("refresh_token", refreshToken2);
  newBody.append("client_id", customerAccountId);
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "User-Agent": USER_AGENT,
    Origin: httpsOrigin
  };
  const startTime = (/* @__PURE__ */ new Date()).getTime();
  const url = customerAccountTokenExchangeUrl;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: newBody
  });
  logSubRequestEvent?.({
    displayName: "Customer Account API: access token refresh",
    url,
    startTime,
    response,
    ...debugInfo
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  }
  const {
    access_token,
    expires_in,
    refresh_token
  } = await response.json();
  if (!access_token || access_token.length === 0) {
    throw new BadRequest("Unauthorized", "Invalid access token received.");
  }
  session.set(CUSTOMER_ACCOUNT_SESSION_KEY, {
    accessToken: access_token,
    // Store the date in future the token expires, separated by two minutes
    expiresAt: new Date((/* @__PURE__ */ new Date()).getTime() + (expires_in - 120) * 1e3).getTime() + "",
    refreshToken: refresh_token,
    idToken
  });
}
function clearSession(session) {
  session.unset(CUSTOMER_ACCOUNT_SESSION_KEY);
  session.unset(BUYER_SESSION_KEY);
}
async function checkExpires({
  locks,
  expiresAt,
  session,
  customerAccountId,
  customerAccountTokenExchangeUrl,
  httpsOrigin,
  debugInfo
}) {
  if (parseInt(expiresAt, 10) - 1e3 < (/* @__PURE__ */ new Date()).getTime()) {
    try {
      if (!locks.refresh)
        locks.refresh = refreshToken({
          session,
          customerAccountId,
          customerAccountTokenExchangeUrl,
          httpsOrigin,
          debugInfo
        });
      await locks.refresh;
      delete locks.refresh;
    } catch (error) {
      clearSession(session);
      if (error && error.status !== 401) {
        throw error;
      } else {
        throw new BadRequest(
          "Unauthorized",
          "Login before querying the Customer Account API."
        );
      }
    }
  }
}
function generateCodeVerifier() {
  const rando = generateRandomCode();
  return base64UrlEncode(rando);
}
async function generateCodeChallenge(codeVerifier) {
  const digestOp = await crypto.subtle.digest(
    { name: "SHA-256" },
    new TextEncoder().encode(codeVerifier)
  );
  const hash = convertBufferToString(digestOp);
  return base64UrlEncode(hash);
}
function generateRandomCode() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function convertBufferToString(hash) {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  return String.fromCharCode(...numberArray);
}
function generateState() {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2);
  return timestamp + randomString;
}
async function exchangeAccessToken(authAccessToken, customerAccountId, customerAccountTokenExchangeUrl, httpsOrigin, debugInfo) {
  const clientId = customerAccountId;
  if (!authAccessToken)
    throw new BadRequest(
      "Unauthorized",
      "oAuth access token was not provided during token exchange."
    );
  const body = new URLSearchParams();
  body.append("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
  body.append("client_id", clientId);
  body.append("audience", CUSTOMER_API_CLIENT_ID);
  body.append("subject_token", authAccessToken);
  body.append(
    "subject_token_type",
    "urn:ietf:params:oauth:token-type:access_token"
  );
  body.append("scopes", "https://api.customers.com/auth/customer.graphql");
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "User-Agent": USER_AGENT,
    Origin: httpsOrigin
  };
  const startTime = (/* @__PURE__ */ new Date()).getTime();
  const url = customerAccountTokenExchangeUrl;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body
  });
  logSubRequestEvent?.({
    displayName: "Customer Account API: access token exchange",
    url,
    startTime,
    response,
    ...debugInfo
  });
  const data = await response.json();
  if (data.error) {
    throw new BadRequest(data.error_description);
  }
  return data.access_token;
}
function getNonce(token) {
  return decodeJwt(token).payload.nonce;
}
function decodeJwt(token) {
  const [header, payload, signature] = token.split(".");
  const decodedHeader = JSON.parse(atob(header));
  const decodedPayload = JSON.parse(atob(payload));
  return {
    header: decodedHeader,
    payload: decodedPayload,
    signature
  };
}

// src/csp/nonce.ts
function generateNonce() {
  return toHexString(randomUint8Array());
}
function randomUint8Array() {
  try {
    return crypto.getRandomValues(new Uint8Array(16));
  } catch (e) {
    return new Uint8Array(16).map(() => Math.random() * 255 | 0);
  }
}
function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ("0" + (byte & 255).toString(16)).slice(-2);
  }).join("");
}

// src/utils/get-redirect-url.ts
function getRedirectUrl(requestUrl) {
  if (!requestUrl) return;
  const { pathname, search } = new URL(requestUrl);
  const redirectFrom = pathname + search;
  const searchParams = new URLSearchParams(search);
  const redirectTo = searchParams.get("return_to") || searchParams.get("redirect");
  if (redirectTo) {
    if (isLocalPath(requestUrl, redirectTo)) {
      return redirectTo;
    } else {
      console.warn(
        `Cross-domain redirects are not supported. Tried to redirect from ${redirectFrom} to ${redirectTo}`
      );
    }
  }
}
function isLocalPath(requestUrl, redirectUrl) {
  try {
    return new URL(requestUrl).origin === new URL(redirectUrl, requestUrl).origin;
  } catch (e) {
    return false;
  }
}
function ensureLocalRedirectUrl({
  requestUrl,
  defaultUrl,
  redirectUrl
}) {
  const fromUrl = requestUrl;
  const defautlUrl = buildURLObject(requestUrl, defaultUrl);
  const toUrl = redirectUrl ? buildURLObject(requestUrl, redirectUrl) : defautlUrl;
  if (isLocalPath(requestUrl, toUrl.toString())) {
    return toUrl.toString();
  } else {
    console.warn(
      `Cross-domain redirects are not supported. Tried to redirect from ${fromUrl} to ${toUrl}. Default url ${defautlUrl} is used instead.`
    );
    return defautlUrl.toString();
  }
}
function buildURLObject(requestUrl, relativeOrAbsoluteUrl) {
  return isAbsoluteUrl(relativeOrAbsoluteUrl) ? new URL(relativeOrAbsoluteUrl) : new URL(relativeOrAbsoluteUrl, new URL(requestUrl).origin);
}
function isAbsoluteUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// src/customer/customer-account-helper.ts
function createCustomerAccountHelper(customerApiVersion, shopId) {
  const customerAccountUrl = `https://shopify.com/${shopId}`;
  const customerAccountAuthUrl = `https://shopify.com/authentication/${shopId}`;
  return function getCustomerAccountUrl(urlType) {
    switch (urlType) {
      case "CA_BASE_URL" /* CA_BASE_URL */:
        return customerAccountUrl;
      case "CA_BASE_AUTH_URL" /* CA_BASE_AUTH_URL */:
        return customerAccountAuthUrl;
      case "GRAPHQL" /* GRAPHQL */:
        return `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`;
      case "AUTH" /* AUTH */:
        return `${customerAccountAuthUrl}/oauth/authorize`;
      case "LOGIN_SCOPE" /* LOGIN_SCOPE */:
        return shopId ? "openid email customer-account-api:full" : "openid email https://api.customers.com/auth/customer.graphql";
      case "TOKEN_EXCHANGE" /* TOKEN_EXCHANGE */:
        return `${customerAccountAuthUrl}/oauth/token`;
      case "LOGOUT" /* LOGOUT */:
        return `${customerAccountAuthUrl}/logout`;
    }
  };
}

// src/customer/customer.ts
function defaultAuthStatusHandler(request, defaultLoginUrl) {
  if (!request.url) return defaultLoginUrl;
  const { pathname } = new URL(request.url);
  const cleanedPathname = pathname.replace(/\.data$/, "").replace(/\/_root$/, "/").replace(/(.+)\/$/, "$1");
  const redirectTo = defaultLoginUrl + `?${new URLSearchParams({ return_to: cleanedPathname }).toString()}`;
  return redirect(redirectTo);
}
function createCustomerAccountClient({
  session,
  customerAccountId,
  shopId,
  customerApiVersion = DEFAULT_CUSTOMER_API_VERSION,
  request,
  waitUntil,
  authUrl,
  customAuthStatusHandler,
  logErrors = true,
  loginPath = "/account/login",
  authorizePath = "/account/authorize",
  defaultRedirectPath = "/account",
  language
}) {
  if (customerApiVersion !== DEFAULT_CUSTOMER_API_VERSION) {
    console.warn(
      `[h2:warn:createCustomerAccountClient] You are using Customer Account API version ${customerApiVersion} when this version of Hydrogen was built for ${DEFAULT_CUSTOMER_API_VERSION}.`
    );
  }
  if (!session) {
    console.warn(
      `[h2:warn:createCustomerAccountClient] session is required to use Customer Account API. Ensure the session object passed in exist.`
    );
  }
  if (!request?.url) {
    throw new Error(
      "[h2:error:createCustomerAccountClient] The request object does not contain a URL."
    );
  }
  const authStatusHandler = customAuthStatusHandler ? customAuthStatusHandler : () => defaultAuthStatusHandler(request, loginPath);
  const requestUrl = new URL(request.url);
  const httpsOrigin = requestUrl.protocol === "http:" ? requestUrl.origin.replace("http", "https") : requestUrl.origin;
  const redirectUri = ensureLocalRedirectUrl({
    requestUrl: httpsOrigin,
    defaultUrl: authorizePath,
    redirectUrl: authUrl
  });
  const getCustomerAccountUrl = createCustomerAccountHelper(
    customerApiVersion,
    shopId
  );
  const ifInvalidCredentialThrowError = createIfInvalidCredentialThrowError(
    getCustomerAccountUrl,
    customerAccountId
  );
  const customerAccountApiUrl = getCustomerAccountUrl("GRAPHQL" /* GRAPHQL */);
  const locks = {};
  async function fetchCustomerAPI({
    query: query2,
    type,
    variables = {}
  }) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw authStatusHandler();
    }
    const stackInfo = getCallerStackLine?.();
    const startTime = (/* @__PURE__ */ new Date()).getTime();
    const response = await fetch(customerAccountApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Origin: httpsOrigin,
        Authorization: accessToken
      },
      body: JSON.stringify({ query: query2, variables })
    });
    logSubRequestEvent?.({
      url: customerAccountApiUrl,
      startTime,
      response,
      waitUntil,
      stackInfo,
      query: query2,
      variables,
      ...getDebugHeaders(request)
    });
    const body = await response.text();
    const errorOptions = {
      url: customerAccountApiUrl,
      response,
      type,
      query: query2,
      queryVariables: variables,
      errors: void 0,
      client: "customer"
    };
    if (!response.ok) {
      if (response.status === 401) {
        clearSession(session);
        const authFailResponse = authStatusHandler();
        throw authFailResponse;
      }
      let errors2;
      try {
        errors2 = parseJSON(body);
      } catch (_e) {
        errors2 = [{ message: body }];
      }
      throwErrorWithGqlLink({ ...errorOptions, errors: errors2 });
    }
    try {
      const APIresponse = parseJSON(body);
      const { errors: errors2 } = APIresponse;
      const gqlErrors = errors2?.map(
        ({ message, ...rest }) => new GraphQLError(message, {
          ...rest,
          clientOperation: `customerAccount.${errorOptions.type}`,
          requestId: response.headers.get("x-request-id"),
          queryVariables: variables,
          query: query2
        })
      );
      return { ...APIresponse, ...errors2 && { errors: gqlErrors } };
    } catch (e) {
      throwErrorWithGqlLink({ ...errorOptions, errors: [{ message: body }] });
    }
  }
  async function isLoggedIn() {
    if (!shopId) return false;
    const customerAccount = session.get(CUSTOMER_ACCOUNT_SESSION_KEY);
    const accessToken = customerAccount?.accessToken;
    const expiresAt = customerAccount?.expiresAt;
    if (!accessToken || !expiresAt) return false;
    const stackInfo = getCallerStackLine?.();
    try {
      await checkExpires({
        locks,
        expiresAt,
        session,
        customerAccountId,
        customerAccountTokenExchangeUrl: getCustomerAccountUrl(
          "TOKEN_EXCHANGE" /* TOKEN_EXCHANGE */
        ),
        httpsOrigin,
        debugInfo: {
          waitUntil,
          stackInfo,
          ...getDebugHeaders(request)
        }
      });
    } catch {
      return false;
    }
    return true;
  }
  async function handleAuthStatus() {
    if (!await isLoggedIn()) {
      throw authStatusHandler();
    }
  }
  async function getAccessToken() {
    const hasAccessToken = await isLoggedIn();
    if (hasAccessToken)
      return session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.accessToken;
  }
  async function mutate(mutation, options) {
    ifInvalidCredentialThrowError();
    mutation = minifyQuery(mutation);
    assertMutation(mutation, "customer.mutate");
    return withSyncStack(
      fetchCustomerAPI({ query: mutation, type: "mutation", ...options }),
      { logErrors }
    );
  }
  async function query(query2, options) {
    ifInvalidCredentialThrowError();
    query2 = minifyQuery(query2);
    assertQuery(query2, "customer.query");
    return withSyncStack(fetchCustomerAPI({ query: query2, type: "query", ...options }), {
      logErrors
    });
  }
  function setBuyer(buyer) {
    session.set(BUYER_SESSION_KEY, {
      ...session.get(BUYER_SESSION_KEY),
      ...buyer
    });
  }
  async function getBuyer() {
    const customerAccessToken = await getAccessToken();
    if (!customerAccessToken) {
      return;
    }
    return { ...session.get(BUYER_SESSION_KEY), customerAccessToken };
  }
  return {
    i18n: { language: language ?? "EN" },
    login: async (options) => {
      ifInvalidCredentialThrowError();
      const loginUrl = new URL(getCustomerAccountUrl("AUTH" /* AUTH */));
      const state = generateState();
      const nonce = generateNonce();
      loginUrl.searchParams.set("client_id", customerAccountId);
      loginUrl.searchParams.set("scope", "openid email");
      loginUrl.searchParams.append("response_type", "code");
      loginUrl.searchParams.append("redirect_uri", redirectUri);
      loginUrl.searchParams.set(
        "scope",
        getCustomerAccountUrl("LOGIN_SCOPE" /* LOGIN_SCOPE */)
      );
      loginUrl.searchParams.append("state", state);
      loginUrl.searchParams.append("nonce", nonce);
      const uiLocales = getMaybeUILocales({
        contextLanguage: language ?? null,
        uiLocalesOverride: options?.uiLocales ?? null
      });
      if (uiLocales != null) {
        loginUrl.searchParams.append("ui_locales", uiLocales);
      }
      if (options?.countryCode) {
        loginUrl.searchParams.append("region_country", options.countryCode);
      }
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      session.set(CUSTOMER_ACCOUNT_SESSION_KEY, {
        ...session.get(CUSTOMER_ACCOUNT_SESSION_KEY),
        codeVerifier: verifier,
        state,
        nonce,
        redirectPath: getRedirectUrl(request.url) || getHeader(request, "Referer") || defaultRedirectPath
      });
      loginUrl.searchParams.append("code_challenge", challenge);
      loginUrl.searchParams.append("code_challenge_method", "S256");
      return redirect(loginUrl.toString());
    },
    logout: async (options) => {
      ifInvalidCredentialThrowError();
      const idToken = session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.idToken;
      const postLogoutRedirectUri = ensureLocalRedirectUrl({
        requestUrl: httpsOrigin,
        defaultUrl: httpsOrigin,
        redirectUrl: options?.postLogoutRedirectUri
      });
      const logoutUrl = idToken ? new URL(
        `${getCustomerAccountUrl("LOGOUT" /* LOGOUT */)}?${new URLSearchParams([
          ["id_token_hint", idToken],
          ["post_logout_redirect_uri", postLogoutRedirectUri]
        ]).toString()}`
      ).toString() : postLogoutRedirectUri;
      clearSession(session);
      const headers = options?.headers instanceof Headers ? options?.headers : new Headers(options?.headers);
      if (!options?.keepSession) {
        if (session.destroy) {
          headers.set("Set-Cookie", await session.destroy());
        } else {
          console.warn(
            "[h2:warn:customerAccount] session.destroy is not available on your session implementation. All session data might not be cleared on logout."
          );
        }
        session.isPending = false;
      }
      return redirect(logoutUrl, { headers });
    },
    isLoggedIn,
    handleAuthStatus,
    getAccessToken,
    getApiUrl: () => customerAccountApiUrl,
    mutate,
    query,
    authorize: async () => {
      ifInvalidCredentialThrowError();
      const code = requestUrl.searchParams.get("code");
      const state = requestUrl.searchParams.get("state");
      if (!code || !state) {
        clearSession(session);
        throw new BadRequest(
          "Unauthorized",
          "No code or state parameter found in the redirect URL."
        );
      }
      if (session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.state !== state) {
        clearSession(session);
        throw new BadRequest(
          "Unauthorized",
          "The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`."
        );
      }
      const clientId = customerAccountId;
      const body = new URLSearchParams();
      body.append("grant_type", "authorization_code");
      body.append("client_id", clientId);
      body.append("redirect_uri", redirectUri);
      body.append("code", code);
      const codeVerifier = session.get(
        CUSTOMER_ACCOUNT_SESSION_KEY
      )?.codeVerifier;
      if (!codeVerifier)
        throw new BadRequest(
          "Unauthorized",
          "No code verifier found in the session. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`."
        );
      body.append("code_verifier", codeVerifier);
      const headers = {
        "content-type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Origin: httpsOrigin
      };
      const stackInfo = getCallerStackLine?.();
      const startTime = (/* @__PURE__ */ new Date()).getTime();
      const url = getCustomerAccountUrl("TOKEN_EXCHANGE" /* TOKEN_EXCHANGE */);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body
      });
      logSubRequestEvent?.({
        url,
        displayName: "Customer Account API: authorize",
        startTime,
        response,
        waitUntil,
        stackInfo,
        ...getDebugHeaders(request)
      });
      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          }
        });
      }
      const {
        access_token,
        expires_in,
        id_token,
        refresh_token
      } = await response.json();
      const sessionNonce = session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.nonce;
      const responseNonce = await getNonce(id_token);
      if (sessionNonce !== responseNonce) {
        throw new BadRequest(
          "Unauthorized",
          `Returned nonce does not match: ${sessionNonce} !== ${responseNonce}`
        );
      }
      let customerAccessToken = access_token;
      if (!shopId) {
        customerAccessToken = await exchangeAccessToken(
          access_token,
          customerAccountId,
          getCustomerAccountUrl("TOKEN_EXCHANGE" /* TOKEN_EXCHANGE */),
          httpsOrigin,
          {
            waitUntil,
            stackInfo,
            ...getDebugHeaders(request)
          }
        );
      }
      const redirectPath = session.get(
        CUSTOMER_ACCOUNT_SESSION_KEY
      )?.redirectPath;
      session.set(CUSTOMER_ACCOUNT_SESSION_KEY, {
        accessToken: customerAccessToken,
        expiresAt: new Date((/* @__PURE__ */ new Date()).getTime() + (expires_in - 120) * 1e3).getTime() + "",
        refreshToken: refresh_token,
        idToken: id_token
      });
      return redirect(redirectPath || defaultRedirectPath);
    },
    setBuyer,
    getBuyer,
    UNSTABLE_setBuyer: (buyer) => {
      warnOnce(
        "[h2:warn:customerAccount] `customerAccount.UNSTABLE_setBuyer` is deprecated. Please use `customerAccount.setBuyer`."
      );
      setBuyer(buyer);
    },
    UNSTABLE_getBuyer: () => {
      warnOnce(
        "[h2:warn:customerAccount] `customerAccount.UNSTABLE_getBuyer` is deprecated. Please use `customerAccount.getBuyer`."
      );
      return getBuyer();
    }
  };
}
function createIfInvalidCredentialThrowError(getCustomerAccountUrl, customerAccountId) {
  return function ifInvalidCredentialThrowError() {
    try {
      if (!customerAccountId) throw Error();
      new URL(getCustomerAccountUrl("CA_BASE_URL" /* CA_BASE_URL */));
      new URL(getCustomerAccountUrl("CA_BASE_AUTH_URL" /* CA_BASE_AUTH_URL */));
    } catch {
      console.error(
        new Error(
          "[h2:error:customerAccount] You do not have the valid credential to use Customer Account API.\nRun `h2 env pull` to link your store credentials."
        )
      );
      const publicMessage = "You do not have the valid credential to use Customer Account API (/account).";
      throw new Response(publicMessage, { status: 500 });
    }
  };
}
function getMaybeUILocales(params) {
  const contextLocale = toMaybeLocaleString(params.contextLanguage ?? null);
  const optionsLocale = toMaybeLocaleString(params.uiLocalesOverride);
  return optionsLocale ?? contextLocale ?? null;
}
function toMaybeLocaleString(language) {
  if (language == null) {
    return null;
  }
  const normalizedLanguage = maybeEnforceRegionalVariant(language);
  const base = normalizedLanguage.toLowerCase().replaceAll("_", "-");
  const tokens = base.split("-");
  const langToken = tokens.at(0) ?? null;
  const regionToken = tokens.at(1) ?? null;
  if (regionToken) {
    return `${langToken}-${regionToken.toUpperCase()}`;
  }
  return langToken;
}
var regionalLanguageOverrides = {
  PT: "PT_PT",
  ZH: "ZH_CN"
};
function maybeEnforceRegionalVariant(language) {
  return regionalLanguageOverrides[language] ?? language;
}
function createHydrogenContext(options, additionalContext) {
  const {
    env,
    request,
    cache,
    waitUntil,
    i18n,
    session,
    logErrors,
    storefront: storefrontOptions = {},
    customerAccount: customerAccountOptions,
    cart: cartOptions = {},
    buyerIdentity
  } = options;
  if (!session) {
    console.warn(
      `[h2:warn:createHydrogenContext] A session object is required to create hydrogen context.`
    );
  }
  if (customerAccountOptions?.unstableB2b) {
    warnOnce(
      "[h2:warn:createHydrogenContext] `customerAccount.unstableB2b` is now stable. Please remove the `unstableB2b` option."
    );
  }
  const { storefront } = createStorefrontClient({
    // share options
    cache,
    waitUntil,
    i18n,
    logErrors,
    // storefrontOptions
    storefrontHeaders: storefrontOptions.headers || getStorefrontHeaders(request),
    storefrontApiVersion: storefrontOptions.apiVersion,
    // defaults
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN
  });
  const customerAccount = createCustomerAccountClient({
    // share options
    session,
    request,
    waitUntil,
    logErrors,
    // customerAccountOptions
    customerApiVersion: customerAccountOptions?.apiVersion,
    authUrl: customerAccountOptions?.authUrl,
    customAuthStatusHandler: customerAccountOptions?.customAuthStatusHandler,
    // locale - i18n.language is a union of StorefrontLanguageCode | CustomerLanguageCode
    // We cast here because createCustomerAccountClient expects CustomerLanguageCode specifically,
    // but the union type is compatible since most language codes overlap between the two APIs
    language: i18n?.language,
    // defaults
    customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
    shopId: env.SHOP_ID
  });
  const cart = createCartHandler({
    // cartOptions
    getCartId: cartOptions.getId || cartGetIdDefault(request.headers),
    setCartId: cartOptions.setId || cartSetIdDefault(),
    cartQueryFragment: cartOptions.queryFragment,
    cartMutateFragment: cartOptions.mutateFragment,
    customMethods: cartOptions.customMethods,
    buyerIdentity,
    // defaults
    storefront,
    customerAccount
  });
  const routerProvider = new RouterContextProvider();
  routerProvider.set(storefrontContext, storefront);
  routerProvider.set(cartContext, cart);
  routerProvider.set(customerAccountContext, customerAccount);
  routerProvider.set(envContext, env);
  routerProvider.set(sessionContext, session);
  if (waitUntil) {
    routerProvider.set(waitUntilContext, waitUntil);
  }
  const services = {
    storefront,
    cart,
    customerAccount,
    env,
    session,
    waitUntil,
    // Merge additional context properties (CMS clients, 3P SDKs, etc.)
    ...additionalContext || {}
  };
  const hybridProvider = new Proxy(routerProvider, {
    get(target, prop, receiver) {
      if (prop in target) {
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      }
      if (prop in services) {
        return services[prop];
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target, prop) {
      return prop in target || prop in services;
    },
    ownKeys(target) {
      return [...Reflect.ownKeys(target), ...Object.keys(services)];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
      if (prop in services) {
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: services[prop]
        };
      }
      return void 0;
    }
  });
  return hybridProvider;
}
function getStorefrontHeaders(request) {
  return {
    requestGroupId: getHeader(request, "request-id"),
    buyerIp: getHeader(request, "oxygen-buyer-ip"),
    cookie: getHeader(request, "cookie"),
    purpose: getHeader(request, "purpose")
  };
}
var NonceContext = createContext(void 0);
var NonceProvider = NonceContext.Provider;
var useNonce = () => useContext(NonceContext);
function createContentSecurityPolicy(props) {
  const nonce = generateNonce();
  const header = createCSPHeader(nonce, props);
  const Provider = ({ children }) => {
    return createElement(NonceProvider, { value: nonce }, children);
  };
  return {
    nonce,
    header,
    NonceProvider: Provider
  };
}
function createCSPHeader(nonce, props) {
  const { shop, ...directives } = props ?? {};
  const nonceString = `'nonce-${nonce}'`;
  const styleSrc = ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"];
  const connectSrc = [
    "'self'",
    "https://cdn.shopify.com/",
    "https://monorail-edge.shopifysvc.com"
  ];
  if (shop && shop.checkoutDomain) {
    connectSrc.push(`https://${shop.checkoutDomain}`);
  }
  if (shop && shop.storeDomain) {
    connectSrc.push(`https://${shop.storeDomain}`);
  }
  const defaultSrc = [
    "'self'",
    nonceString,
    "https://cdn.shopify.com",
    // Used for the Customer Account API
    "https://shopify.com"
  ];
  const defaultDirectives = {
    baseUri: ["'self'"],
    defaultSrc,
    frameAncestors: ["'none'"],
    styleSrc,
    connectSrc
  };
  {
    defaultDirectives.styleSrc = [...styleSrc, "http://localhost:*"];
    defaultDirectives.defaultSrc = [...defaultSrc, "http://localhost:*"];
    defaultDirectives.connectSrc = [
      ...connectSrc,
      "http://localhost:*",
      // For HMR:
      "ws://localhost:*",
      "ws://127.0.0.1:*",
      "ws://*.tryhydrogen.dev:*"
    ];
  }
  const combinedDirectives = Object.assign({}, defaultDirectives, directives);
  for (const key in defaultDirectives) {
    const directive = directives[key];
    if (key && directive) {
      combinedDirectives[key] = addCspDirective(
        directive,
        defaultDirectives[key]
      );
    }
  }
  if (combinedDirectives.scriptSrc instanceof Array) {
    combinedDirectives.scriptSrc = [
      ...combinedDirectives.scriptSrc.filter((ss) => !ss.startsWith(`'nonce`)),
      nonceString
    ];
  } else if (combinedDirectives.defaultSrc instanceof Array) {
    combinedDirectives.defaultSrc = [
      ...combinedDirectives.defaultSrc.filter((ss) => !ss.startsWith(`'nonce`)),
      nonceString
    ];
  }
  return cspBuilder({
    directives: combinedDirectives
  });
}
function addCspDirective(currentValue, value) {
  const normalizedValue = typeof value === "string" ? [value] : value;
  const normalizedCurrentValue = Array.isArray(currentValue) ? currentValue : [String(currentValue)];
  const newValue = Array.isArray(normalizedValue) ? (
    // If the default directive is `none`, don't
    // merge the override with the default value.
    normalizedValue.every((a) => a === `'none'`) ? normalizedCurrentValue : [...normalizedCurrentValue, ...normalizedValue]
  ) : normalizedValue;
  return newValue;
}
var Script = forwardRef(
  (props, ref) => {
    const { waitForHydration, src, ...rest } = props;
    const nonce = useNonce();
    if (waitForHydration) return /* @__PURE__ */ jsx(LazyScript, { src, options: rest });
    return /* @__PURE__ */ jsx(
      "script",
      {
        suppressHydrationWarning: true,
        ...rest,
        src,
        nonce,
        ref
      }
    );
  }
);
function LazyScript({
  src,
  options
}) {
  if (!src)
    throw new Error(
      "`waitForHydration` with the Script component requires a `src` prop"
    );
  useLoadScript(src, {
    attributes: options
  });
  return null;
}

// src/dev/hydrogen-routes.ts
async function hydrogenRoutes(currentRoutes) {
  const { getVirtualRoutesV3 } = await import('./get-virtual-routes-XE7G57DS.js');
  const { layout, routes: virtualRoutes } = await getVirtualRoutesV3();
  const childVirtualRoutes = virtualRoutes.map(({ path, file, index, id }) => {
    return {
      file,
      id,
      index,
      path
    };
  });
  const virtualLayout = {
    file: layout.file,
    children: childVirtualRoutes
  };
  return [...currentRoutes, virtualLayout];
}
function useOptimisticData(identifier) {
  const fetchers = useFetchers();
  const data = {};
  for (const { formData } of fetchers) {
    if (formData?.get("optimistic-identifier") === identifier) {
      try {
        if (formData.has("optimistic-data")) {
          const dataInForm = JSON.parse(
            String(formData.get("optimistic-data"))
          );
          Object.assign(data, dataInForm);
        }
      } catch {
      }
    }
  }
  return data;
}
function OptimisticInput({ id, data }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("input", { type: "hidden", name: "optimistic-identifier", value: id }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "hidden",
        name: "optimistic-data",
        value: JSON.stringify(data)
      }
    )
  ] });
}
function Pagination({
  connection,
  children = () => {
    console.warn("<Pagination> requires children to work properly");
    return null;
  },
  namespace = ""
}) {
  const [isLoading, setIsLoading] = useState(false);
  const transition = useNavigation();
  const location = useLocation();
  useNavigate();
  useEffect(() => {
    if (transition.state === "idle") {
      setIsLoading(false);
    }
  }, [transition.state]);
  const {
    endCursor,
    hasNextPage,
    hasPreviousPage,
    nextPageUrl,
    nodes,
    previousPageUrl,
    startCursor
  } = usePagination(connection, namespace);
  const state = useMemo(
    () => ({
      ...location.state,
      pagination: {
        ...location.state?.pagination || {},
        [namespace]: {
          pageInfo: {
            endCursor,
            hasPreviousPage,
            hasNextPage,
            startCursor
          },
          nodes
        }
      }
    }),
    [
      endCursor,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      nodes,
      namespace,
      location.state
    ]
  );
  const NextLink = useMemo(
    () => forwardRef(
      function NextLink2(props, ref) {
        return hasNextPage ? createElement(Link, {
          preventScrollReset: true,
          ...props,
          to: nextPageUrl,
          state,
          replace: true,
          ref,
          onClick: () => setIsLoading(true)
        }) : null;
      }
    ),
    [hasNextPage, nextPageUrl, state]
  );
  const PreviousLink = useMemo(
    () => forwardRef(
      function PrevLink(props, ref) {
        return hasPreviousPage ? createElement(Link, {
          preventScrollReset: true,
          ...props,
          to: previousPageUrl,
          state,
          replace: true,
          ref,
          onClick: () => setIsLoading(true)
        }) : null;
      }
    ),
    [hasPreviousPage, previousPageUrl, state]
  );
  return children({
    state,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    nextPageUrl,
    nodes,
    previousPageUrl,
    NextLink,
    PreviousLink
  });
}
function getParamsWithoutPagination(paramsString, state) {
  const params = new URLSearchParams(paramsString);
  const activeNamespaces = Object.keys(state?.pagination || {});
  activeNamespaces.forEach((namespace) => {
    const namespacePrefix = namespace === "" ? "" : `${namespace}_`;
    const cursorParam = `${namespacePrefix}cursor`;
    const directionParam = `${namespacePrefix}direction`;
    params.delete(cursorParam);
    params.delete(directionParam);
  });
  return params.toString();
}
function makeError(prop) {
  throw new Error(
    `The Pagination component requires ${"`" + prop + "`"} to be a part of your query. See the guide on how to setup your query to include ${"`" + prop + "`"}: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query`
  );
}
function usePagination(connection, namespace = "") {
  if (!connection.pageInfo) {
    makeError("pageInfo");
  }
  if (typeof connection.pageInfo.startCursor === "undefined") {
    makeError("pageInfo.startCursor");
  }
  if (typeof connection.pageInfo.endCursor === "undefined") {
    makeError("pageInfo.endCursor");
  }
  if (typeof connection.pageInfo.hasNextPage === "undefined") {
    makeError("pageInfo.hasNextPage");
  }
  if (typeof connection.pageInfo.hasPreviousPage === "undefined") {
    makeError("pageInfo.hasPreviousPage");
  }
  const transition = useNavigation();
  const navigate = useNavigate();
  const { state, search, pathname } = useLocation();
  const cursorParam = namespace ? `${namespace}_cursor` : "cursor";
  const directionParam = namespace ? `${namespace}_direction` : "direction";
  const params = new URLSearchParams(search);
  const direction = params.get(directionParam);
  const isPrevious = direction === "previous";
  const nodes = useMemo(() => {
    if (!globalThis?.window?.__hydrogenHydrated || !state?.pagination?.[namespace]?.nodes) {
      return flattenConnection(connection);
    }
    if (isPrevious) {
      return [
        ...flattenConnection(connection),
        ...state.pagination[namespace].nodes || []
      ];
    } else {
      return [
        ...state.pagination[namespace].nodes || [],
        ...flattenConnection(connection)
      ];
    }
  }, [state, connection, namespace]);
  const currentPageInfo = useMemo(() => {
    const hydrogenHydrated = globalThis?.window?.__hydrogenHydrated;
    const stateInfo = state?.pagination?.[namespace]?.pageInfo;
    let pageStartCursor = !hydrogenHydrated || stateInfo?.startCursor === void 0 ? connection.pageInfo.startCursor : stateInfo.startCursor;
    let pageEndCursor = !hydrogenHydrated || stateInfo?.endCursor === void 0 ? connection.pageInfo.endCursor : stateInfo.endCursor;
    let previousPageExists = !hydrogenHydrated || stateInfo?.hasPreviousPage === void 0 ? connection.pageInfo.hasPreviousPage : stateInfo.hasPreviousPage;
    let nextPageExists = !hydrogenHydrated || stateInfo?.hasNextPage === void 0 ? connection.pageInfo.hasNextPage : stateInfo.hasNextPage;
    if (state?.pagination?.[namespace]?.nodes) {
      if (isPrevious) {
        pageStartCursor = connection.pageInfo.startCursor;
        previousPageExists = connection.pageInfo.hasPreviousPage;
      } else {
        pageEndCursor = connection.pageInfo.endCursor;
        nextPageExists = connection.pageInfo.hasNextPage;
      }
    }
    return {
      startCursor: pageStartCursor,
      endCursor: pageEndCursor,
      hasPreviousPage: previousPageExists,
      hasNextPage: nextPageExists
    };
  }, [
    isPrevious,
    state,
    namespace,
    connection.pageInfo.hasNextPage,
    connection.pageInfo.hasPreviousPage,
    connection.pageInfo.startCursor,
    connection.pageInfo.endCursor
  ]);
  const urlRef = useRef({
    params: getParamsWithoutPagination(search, state),
    pathname
  });
  useEffect(() => {
    window.__hydrogenHydrated = true;
  }, []);
  useEffect(() => {
    const currentParams = getParamsWithoutPagination(search, state);
    const previousParams = urlRef.current.params;
    const pathChanged = pathname !== urlRef.current.pathname;
    const nonPaginationParamsChanged = currentParams !== previousParams;
    if (
      // Only clean up if the base URL or non-pagination params change
      (pathChanged || nonPaginationParamsChanged) && // And we're not on the initial load
      !(transition.state === "idle" && !transition.location)
    ) {
      urlRef.current = {
        pathname,
        params: getParamsWithoutPagination(search, state)
      };
      navigate(`${pathname}?${getParamsWithoutPagination(search, state)}`, {
        replace: true,
        preventScrollReset: true,
        state: { nodes: void 0, pageInfo: void 0 }
      });
    }
  }, [pathname, search, state]);
  const previousPageUrl = useMemo(() => {
    const params2 = new URLSearchParams(search);
    params2.set(directionParam, "previous");
    currentPageInfo.startCursor && params2.set(cursorParam, currentPageInfo.startCursor);
    return `?${params2.toString()}`;
  }, [search, currentPageInfo.startCursor]);
  const nextPageUrl = useMemo(() => {
    const params2 = new URLSearchParams(search);
    params2.set(directionParam, "next");
    currentPageInfo.endCursor && params2.set(cursorParam, currentPageInfo.endCursor);
    return `?${params2.toString()}`;
  }, [search, currentPageInfo.endCursor]);
  return { ...currentPageInfo, previousPageUrl, nextPageUrl, nodes };
}
function getPaginationVariables(request, options = { pageBy: 20 }) {
  if (typeof request?.url === "undefined") {
    throw new Error(
      "getPaginationVariables must be called with the Request object passed to your loader function"
    );
  }
  const { pageBy, namespace = "" } = options;
  const searchParams = new URLSearchParams(new URL(request.url).search);
  const cursorParam = namespace ? `${namespace}_cursor` : "cursor";
  const directionParam = namespace ? `${namespace}_direction` : "direction";
  const cursor = searchParams.get(cursorParam) ?? void 0;
  const direction = searchParams.get(directionParam) === "previous" ? "previous" : "next";
  const isPrevious = direction === "previous";
  const prevPage = {
    last: pageBy,
    startCursor: cursor ?? null
  };
  const nextPage = {
    first: pageBy,
    endCursor: cursor ?? null
  };
  const variables = isPrevious ? prevPage : nextPage;
  return variables;
}
function useOptimisticVariant(selectedVariant, variants) {
  const navigation = useNavigation();
  const [resolvedVariants, setResolvedVariants] = useState([]);
  useEffect(() => {
    Promise.resolve(variants).then((productWithVariants) => {
      if (productWithVariants) {
        setResolvedVariants(
          productWithVariants instanceof Array ? productWithVariants : productWithVariants.product?.variants?.nodes || []
        );
      }
    }).catch((error) => {
      reportError(
        new Error(
          "[h2:error:useOptimisticVariant] An error occurred while resolving the variants for the optimistic product hook.",
          {
            cause: error
          }
        )
      );
    });
  }, [JSON.stringify(variants)]);
  if (navigation.state === "loading") {
    const queryParams = new URLSearchParams(navigation.location.search);
    let reportedError = false;
    const matchingVariant = resolvedVariants.find((variant) => {
      if (!variant.selectedOptions) {
        if (!reportedError) {
          reportedError = true;
          reportError(
            new Error(
              "[h2:error:useOptimisticVariant] The optimistic product hook requires your product query to include variants with the selectedOptions field."
            )
          );
        }
        return false;
      }
      return variant.selectedOptions.every((option) => {
        return queryParams.get(option.name) === option.value;
      });
    });
    if (matchingVariant) {
      return {
        ...matchingVariant,
        isOptimistic: true
      };
    }
  }
  return selectedVariant;
}
function VariantSelector({
  handle,
  options: _options = [],
  variants: _variants = [],
  productPath = "products",
  waitForNavigation = false,
  selectedVariant,
  children
}) {
  let options = _options;
  if (options[0]?.values) {
    warnOnce(
      "[h2:warn:VariantSelector] product.options.values is deprecated. Use product.options.optionValues instead."
    );
    if (!!options[0] && !options[0].optionValues) {
      options = _options.map((option) => ({
        ...option,
        optionValues: option.values?.map((value) => ({ name: value })) || []
      }));
    }
  }
  const variants = _variants instanceof Array ? _variants : flattenConnection(_variants);
  const { searchParams, path, alreadyOnProductPage } = useVariantPath(
    handle,
    productPath,
    waitForNavigation
  );
  const optionsWithOnlyOneValue = options.filter(
    (option) => option?.optionValues?.length === 1
  );
  const selectedVariantOptions = selectedVariant ? selectedVariant?.selectedOptions?.reduce(
    (selectedValues, item) => {
      selectedValues[item.name] = item.value;
      return selectedValues;
    },
    {}
  ) : {};
  return createElement(
    Fragment$1,
    null,
    ...useMemo(() => {
      return options.map((option) => {
        let activeValue;
        let availableValues = [];
        for (let value of option.optionValues) {
          const clonedSearchParams = new URLSearchParams(
            alreadyOnProductPage ? searchParams : void 0
          );
          clonedSearchParams.set(option.name, value.name);
          optionsWithOnlyOneValue.forEach((option2) => {
            if (option2.optionValues[0].name)
              clonedSearchParams.set(
                option2.name,
                option2.optionValues[0].name
              );
          });
          const variant = variants.find((variant2) => {
            return variant2?.selectedOptions?.every((selectedOption) => {
              const selectedValue2 = clonedSearchParams.get(selectedOption?.name) || selectedVariantOptions?.[selectedOption?.name];
              return selectedValue2 === selectedOption?.value;
            });
          });
          let selectedValue = searchParams.get(option.name);
          if (!selectedValue && selectedVariant) {
            selectedValue = selectedVariantOptions?.[option.name] || null;
          }
          const calculatedActiveValue = selectedValue ? (
            // If a URL parameter exists for the current option, check if it equals the current value
            selectedValue === value.name
          ) : false;
          if (calculatedActiveValue) {
            activeValue = value.name;
          }
          const searchString = "?" + clonedSearchParams.toString();
          availableValues.push({
            value: value.name,
            optionValue: value,
            isAvailable: variant ? variant.availableForSale : true,
            to: path + searchString,
            search: searchString,
            isActive: calculatedActiveValue,
            variant
          });
        }
        return children({
          option: {
            name: option.name,
            value: activeValue,
            values: availableValues
          }
        });
      });
    }, [options, variants, children])
  );
}
var getSelectedProductOptions = (request) => {
  if (typeof request?.url === "undefined")
    throw new TypeError(`Expected a Request instance, got ${typeof request}`);
  const searchParams = new URL(request.url).searchParams;
  const selectedOptions = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({ name, value });
  });
  return selectedOptions;
};
function useVariantPath(handle, productPath, waitForNavigation) {
  const { pathname, search } = useLocation();
  const navigation = useNavigation();
  return useMemo(() => {
    const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
    const isLocalePathname = match && match.length > 0;
    productPath = productPath.startsWith("/") ? productPath.substring(1) : productPath;
    const path = isLocalePathname ? `${match[0]}${productPath}/${handle}` : `/${productPath}/${handle}`;
    const searchParams = new URLSearchParams(
      // Remix doesn't update the location until pending loaders complete.
      // By default we use the destination search params to make selecting a variant
      // instant, but `waitForNavigation` makes the UI wait to update by only using
      // the active browser search params.
      waitForNavigation || navigation.state !== "loading" ? search : navigation.location.search
    );
    return {
      searchParams,
      // If the current pathname matches the product page, we need to make sure
      // that we append to the current search params. Otherwise all the search
      // params can be generated new.
      alreadyOnProductPage: path === pathname,
      path
    };
  }, [pathname, search, waitForNavigation, handle, productPath, navigation]);
}

// src/react-router-preset.ts
function hydrogenPreset() {
  return {
    name: "hydrogen-2025.7.0",
    reactRouterConfig: () => ({
      appDirectory: "app",
      buildDirectory: "dist",
      ssr: true,
      future: {
        v8_middleware: true,
        unstable_optimizeDeps: true,
        unstable_splitRouteModules: true,
        unstable_subResourceIntegrity: false,
        unstable_viteEnvironmentApi: false
      }
    }),
    reactRouterConfigResolved: ({ reactRouterConfig }) => {
      if (reactRouterConfig.basename && reactRouterConfig.basename !== "/") {
        throw new Error(
          "[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0.\nReason: Requires major CLI infrastructure modernization.\nWorkaround: Use reverse proxy or CDN path rewriting for subdirectory hosting."
        );
      }
      if (reactRouterConfig.prerender) {
        throw new Error(
          "[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0.\nReason: React Router plugin incompatibility with Hydrogen CLI build pipeline.\nWorkaround: Use external static generation tools or server-side caching."
        );
      }
      if (reactRouterConfig.serverBundles) {
        throw new Error(
          "[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0.\nReason: React Router plugin manifest incompatibility with Hydrogen CLI.\nAlternative: Route-level code splitting via unstable_splitRouteModules is enabled."
        );
      }
      if (reactRouterConfig.buildEnd) {
        throw new Error(
          "[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0.\nReason: Hydrogen CLI bypasses React Router buildEnd hook execution.\nWorkaround: Use external build scripts or package.json post-build hooks."
        );
      }
      if (reactRouterConfig.future?.unstable_subResourceIntegrity === true) {
        throw new Error(
          "[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled.\nReason: Conflicts with Hydrogen CSP nonce-based authentication.\nImpact: Would break Content Security Policy and cause script execution failures."
        );
      }
    }
  };
}
var RichText = function(props) {
  return /* @__PURE__ */ jsx(
    RichText$1,
    {
      ...props,
      components: {
        link: ({ node }) => /* @__PURE__ */ jsx(
          Link,
          {
            to: node.url,
            title: node.title,
            target: node.target,
            prefetch: "intent",
            children: node.children
          }
        ),
        ...props.components
      }
    }
  );
};

// src/routing/graphiql.ts
var graphiqlLoader = async function graphiqlLoader2({
  request,
  context
}) {
  const storefront = context.storefront;
  const customerAccount = context.customerAccount;
  const url = new URL(request.url);
  if (!storefront) {
    throw new Error(
      `GraphiQL: Hydrogen's storefront client must be injected in the loader context.`
    );
  }
  const schemas = {};
  if (storefront) {
    const authHeader = "X-Shopify-Storefront-Access-Token";
    schemas.storefront = {
      name: "Storefront API",
      authHeader,
      accessToken: storefront.getPublicTokenHeaders()[authHeader],
      apiUrl: storefront.getApiUrl(),
      icon: "SF"
    };
  }
  if (customerAccount) {
    const customerAccountSchema = await (await fetch(url.origin + "/graphiql/customer-account.schema.json")).json();
    const accessToken = await customerAccount.getAccessToken();
    if (customerAccountSchema) {
      schemas["customer-account"] = {
        name: "Customer Account API",
        value: customerAccountSchema,
        authHeader: "Authorization",
        accessToken,
        apiUrl: customerAccount.getApiUrl(),
        icon: "CA"
      };
    }
  }
  const favicon = `https://avatars.githubusercontent.com/u/12972006?s=48&v=4`;
  const html = String.raw;
  return new Response(
    html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>GraphiQL</title>
          <link rel="icon" type="image/x-icon" href="${favicon}" />
          <meta charset="utf-8" />
          <style>
            body {
              height: 100%;
              margin: 0;
              width: 100%;
              overflow: hidden;
              background-color: hsl(219, 29%, 18%);
            }

            #graphiql {
              height: 100vh;
            }

            #graphiql > .placeholder {
              color: slategray;
              width: fit-content;
              margin: 40px auto;
              font-family: Arial;
            }

            .graphiql-api-toolbar-label {
              position: absolute;
              bottom: -6px;
              right: -4px;
              font-size: 8px;
            }
          </style>

          <link
            rel="stylesheet"
            href="https://esm.sh/graphiql/dist/style.css"
          />

          <link
            rel="stylesheet"
            href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
          />
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@19.1.0",
                "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",
                "react-dom": "https://esm.sh/react-dom@19.1.0",
                "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",

                "graphql": "https://esm.sh/graphql@16.11.0",

                "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
                "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
                "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql",
                "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql"
              }
            }
          </script>
          <script type="module">
            // Import React and ReactDOM
            import React from 'react';
            import ReactDOM from 'react-dom/client';

            // Import GraphiQL and the Explorer plugin
            import {GraphiQL, HISTORY_PLUGIN} from 'graphiql';
            import {createGraphiQLFetcher} from '@graphiql/toolkit';
            import {explorerPlugin} from '@graphiql/plugin-explorer';
            import {ToolbarButton} from '@graphiql/react';

            import createJSONWorker from 'https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker';
            import createGraphQLWorker from 'https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker';
            import createEditorWorker from 'https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker';
            import {parse, print} from 'graphql';

            globalThis.MonacoEnvironment = {
              getWorker(_workerId, label) {
                switch (label) {
                  case 'json':
                    return createJSONWorker();
                  case 'graphql':
                    return createGraphQLWorker();
                }
                return createEditorWorker();
              },
            };

            const windowUrl = new URL(document.URL);
            const startingSchemaKey =
              windowUrl.searchParams.get('schema') || 'storefront';

            let initialQuery = '{ shop { name } }';
            if (windowUrl.searchParams.has('query')) {
              initialQuery = decodeURIComponent(
                windowUrl.searchParams.get('query') ?? query,
              );
            }

            // Prettify query
            initialQuery = print(parse(initialQuery));

            let variables;
            if (windowUrl.searchParams.has('variables')) {
              variables = decodeURIComponent(
                windowUrl.searchParams.get('variables') ?? '',
              );
            }

            // Prettify variables
            if (variables) {
              variables = JSON.stringify(JSON.parse(variables), null, 2);
            }

            const schemas = ${JSON.stringify(schemas)};

            let lastActiveTabIndex = -1;
            let lastTabAmount = -1;

            const TAB_STATE_KEY = 'graphiql:tabState';
            const storage = {
              getTabState: () =>
                JSON.parse(localStorage.getItem(TAB_STATE_KEY)),
              setTabState: (state) =>
                localStorage.setItem(TAB_STATE_KEY, JSON.stringify(state)),
            };

            let nextSchemaKey;

            function App() {
              const [activeSchema, setActiveSchema] =
                React.useState(startingSchemaKey);

              const schema = schemas[activeSchema];

              if (!schema) {
                throw new Error('No schema found for ' + activeSchema);
              }

              const fetcher = createGraphiQLFetcher({
                url: schema.apiUrl,
                headers: {[schema.authHeader]: schema.accessToken},
                enableIncrementalDelivery: false,
              });

              // We create a custom fetcher because createGraphiQLFetcher attempts to introspect the schema
              // and the Customer Account API does not support introspection.
              // We  override the fetcher to return the schema directly only for the CAAPI introspection query.
              function createJsonFetcher(options, httpFetch) {
                if (activeSchema === 'storefront') {
                  return fetcher(options, httpFetch);
                } else {
                  // CAAPI requires a custom fetcher
                  if (options.operationName === 'IntrospectionQuery') {
                    return {data: schema.value};
                  } else {
                    return fetcher(options, httpFetch);
                  }
                }
              }

              const keys = Object.keys(schemas);

              function onTabChange(state) {
                const {activeTabIndex, tabs} = state;
                const activeTab = tabs[activeTabIndex];

                if (
                  activeTabIndex === lastActiveTabIndex &&
                  lastTabAmount === tabs.length
                ) {
                  if (
                    nextSchemaKey &&
                    activeTab &&
                    activeTab.schemaKey !== nextSchemaKey
                  ) {
                    activeTab.schemaKey = nextSchemaKey;
                    nextSchemaKey = undefined;

                    // Sync state to localStorage. GraphiQL resets the state
                    // asynchronously, so we need to do it in a timeout.
                    storage.setTabState(state);
                    setTimeout(() => storage.setTabState(state), 500);
                  }

                  // React rerrendering, skip
                  return;
                }

                if (activeTab) {
                  if (!activeTab.schemaKey) {
                    // Creating a new tab
                    if (lastTabAmount < tabs.length) {
                      activeTab.schemaKey = activeSchema;
                      storage.setTabState(state);
                    }
                  }

                  const nextSchema = activeTab.schemaKey || 'storefront';

                  if (nextSchema !== activeSchema) {
                    setActiveSchema(nextSchema);
                  }
                }

                lastActiveTabIndex = activeTabIndex;
                lastTabAmount = tabs.length;
              }

              const plugins = [HISTORY_PLUGIN, explorerPlugin()];

              const props = {
                fetcher: createJsonFetcher,
                defaultEditorToolsVisibility: true,
                initialQuery,
                variables,
                schema: schema.value,
                plugins,
                onTabChange,
              };

              function toggleSelectedApi() {
                const activeKeyIndex = keys.indexOf(activeSchema);
                nextSchemaKey = keys[(activeKeyIndex + 1) % keys.length];

                // This triggers onTabChange
                if (nextSchemaKey) setActiveSchema(nextSchemaKey);
              }

              const CustomToolbar = React.createElement(
                GraphiQL.Toolbar,
                {
                  key: 'Custom Toolbar',
                },
                [
                  React.createElement(
                    ToolbarButton,
                    {
                      key: 'api-wrapper',
                      onClick: toggleSelectedApi,
                      label: 'Toggle between different API schemas',
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'icon',
                          style: {
                            textAlign: 'center',
                          },
                        },
                        [
                          schema.icon,
                          React.createElement(
                            'div',
                            {
                              key: 'icon-label',
                              className: 'graphiql-api-toolbar-label',
                            },
                            'API',
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              );

              const CustomLogo = React.createElement(
                GraphiQL.Logo,
                {
                  key: 'Logo replacement',
                },
                [
                  React.createElement(
                    'div',
                    {
                      key: 'Logo wrapper',
                      style: {display: 'flex', alignItems: 'center'},
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'api',
                          className: 'graphiql-logo',
                          style: {
                            paddingRight: 0,
                            whiteSpace: 'nowrap',
                          },
                        },
                        [schema.name],
                      ),
                      React.createElement(GraphiQL.Logo, {key: 'logo'}),
                    ],
                  ),
                ],
              );

              const children = [CustomToolbar, CustomLogo];

              return React.createElement(GraphiQL, props, children);
            }

            const container = document.getElementById('graphiql');

            const root = ReactDOM.createRoot(container);

            root.render(React.createElement(App));
          </script>
        </head>

        <body>
          <div id="graphiql">
            <div class="placeholder">Loading GraphiQL...</div>
          </div>
        </body>
      </html>
    `,
    { status: 200, headers: { "content-type": "text/html" } }
  );
};

// src/routing/redirect.ts
async function storefrontRedirect(options) {
  const {
    storefront,
    request,
    noAdminRedirect,
    matchQueryParams,
    response = new Response("Not Found", { status: 404 })
  } = options;
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const isSoftNavigation = searchParams.has("_data");
  searchParams.delete("redirect");
  searchParams.delete("return_to");
  searchParams.delete("_data");
  const redirectFrom = (matchQueryParams ? url.toString().replace(url.origin, "") : pathname).toLowerCase();
  if (url.pathname === "/admin" && !noAdminRedirect) {
    return createRedirectResponse(
      `${storefront.getShopifyDomain()}/admin`,
      isSoftNavigation,
      searchParams,
      matchQueryParams
    );
  }
  try {
    const { urlRedirects } = await storefront.query(REDIRECT_QUERY, {
      // The admin doesn't allow redirects to have a
      // trailing slash, so strip them all off
      variables: { query: "path:" + redirectFrom.replace(/\/+$/, "") }
    });
    const location = urlRedirects?.edges?.[0]?.node?.target;
    if (location) {
      return createRedirectResponse(
        location,
        isSoftNavigation,
        searchParams,
        matchQueryParams
      );
    }
    const redirectTo = getRedirectUrl(request.url);
    if (redirectTo) {
      return createRedirectResponse(
        redirectTo,
        isSoftNavigation,
        searchParams,
        matchQueryParams
      );
    }
  } catch (error) {
    console.error(
      `Failed to fetch redirects from Storefront API for route ${redirectFrom}`,
      error
    );
  }
  return response;
}
var TEMP_DOMAIN = "https://example.com";
function createRedirectResponse(location, isSoftNavigation, searchParams, matchQueryParams) {
  const url = new URL(location, TEMP_DOMAIN);
  if (!matchQueryParams) {
    for (const [key, value] of searchParams) {
      url.searchParams.append(key, value);
    }
  }
  if (isSoftNavigation) {
    return new Response(null, {
      status: 200,
      headers: {
        "X-Remix-Redirect": url.toString().replace(TEMP_DOMAIN, ""),
        "X-Remix-Status": "301"
      }
    });
  } else {
    return new Response(null, {
      status: 301,
      headers: { location: url.toString().replace(TEMP_DOMAIN, "") }
    });
  }
}
var REDIRECT_QUERY = `#graphql
  query redirects($query: String) {
    urlRedirects(first: 1, query: $query) {
      edges {
        node {
          target
        }
      }
    }
  }
`;

// src/seo/escape.ts
var ESCAPE_LOOKUP = {
  "&": "\\u0026",
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var ESCAPE_REGEX = /[&><\u2028\u2029]/g;
function escapeHtml(html) {
  return html.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

// src/seo/generate-seo-tags.ts
var ERROR_PREFIX = "Error in SEO input: ";
var schema = {
  title: {
    validate: (value) => {
      if (typeof value !== "string") {
        throw new Error(ERROR_PREFIX.concat("`title` should be a string"));
      }
      if (typeof value === "string" && value.length > 120) {
        throw new Error(
          ERROR_PREFIX.concat(
            "`title` should not be longer than 120 characters"
          )
        );
      }
      return value;
    }
  },
  description: {
    validate: (value) => {
      if (typeof value !== "string") {
        throw new Error(
          ERROR_PREFIX.concat("`description` should be a string")
        );
      }
      if (typeof value === "string" && value.length > 155) {
        throw new Error(
          ERROR_PREFIX.concat(
            "`description` should not be longer than 155 characters"
          )
        );
      }
      return value;
    }
  },
  url: {
    validate: (value) => {
      if (typeof value !== "string") {
        throw new Error(ERROR_PREFIX.concat("`url` should be a string"));
      }
      if (typeof value === "string" && !value.startsWith("http")) {
        throw new Error(ERROR_PREFIX.concat("`url` should be a valid URL"));
      }
      return value;
    }
  },
  handle: {
    validate: (value) => {
      if (typeof value !== "string") {
        throw new Error(ERROR_PREFIX.concat("`handle` should be a string"));
      }
      if (typeof value === "string" && !value.startsWith("@")) {
        throw new Error(ERROR_PREFIX.concat("`handle` should start with `@`"));
      }
      return value;
    }
  }
};
function generateSeoTags(seoInput) {
  const tagResults = [];
  for (const seoKey of Object.keys(seoInput)) {
    switch (seoKey) {
      case "title": {
        const content = validate(schema.title, seoInput.title);
        const title = renderTitle(seoInput?.titleTemplate, content);
        if (!title) {
          break;
        }
        tagResults.push(
          generateTag("title", { title }),
          generateTag("meta", { property: "og:title", content: title }),
          generateTag("meta", { name: "twitter:title", content: title })
        );
        break;
      }
      case "description": {
        const content = validate(schema.description, seoInput.description);
        if (!content) {
          break;
        }
        tagResults.push(
          generateTag("meta", {
            name: "description",
            content
          }),
          generateTag("meta", {
            property: "og:description",
            content
          }),
          generateTag("meta", {
            name: "twitter:description",
            content
          })
        );
        break;
      }
      case "url": {
        const content = validate(schema.url, seoInput.url);
        if (!content) {
          break;
        }
        const urlWithoutParams = content.split("?")[0];
        const urlWithoutTrailingSlash = urlWithoutParams.replace(/\/$/, "");
        tagResults.push(
          generateTag("link", {
            rel: "canonical",
            href: urlWithoutTrailingSlash
          }),
          generateTag("meta", {
            property: "og:url",
            content: urlWithoutTrailingSlash
          })
        );
        break;
      }
      case "handle": {
        const content = validate(schema.handle, seoInput.handle);
        if (!content) {
          break;
        }
        tagResults.push(
          generateTag("meta", { name: "twitter:site", content }),
          generateTag("meta", { name: "twitter:creator", content })
        );
        break;
      }
      case "media": {
        let content;
        const values = ensureArray(seoInput.media);
        for (const media of values) {
          if (typeof media === "string") {
            tagResults.push(
              generateTag("meta", { name: "og:image", content: media })
            );
          }
          if (media && typeof media === "object") {
            const type = media.type || "image";
            const normalizedMedia = media ? {
              url: media?.url,
              secure_url: media?.url,
              type: inferMimeType(media.url),
              width: media?.width,
              height: media?.height,
              alt: media?.altText
            } : {};
            for (const key of Object.keys(normalizedMedia)) {
              if (normalizedMedia[key]) {
                content = normalizedMedia[key];
                tagResults.push(
                  generateTag(
                    "meta",
                    {
                      property: `og:${type}:${key}`,
                      content
                    },
                    normalizedMedia.url
                  )
                );
              }
            }
          }
        }
        break;
      }
      case "jsonLd": {
        const jsonLdBlocks = ensureArray(seoInput.jsonLd);
        let index = 0;
        for (const block of jsonLdBlocks) {
          if (typeof block !== "object") {
            continue;
          }
          const tag = generateTag(
            "script",
            {
              type: "application/ld+json",
              children: JSON.stringify(block, (k, value) => {
                return typeof value === "string" ? escapeHtml(value) : value;
              })
            },
            // @ts-expect-error
            `json-ld-${block?.["@type"] || block?.name || index++}`
          );
          tagResults.push(tag);
        }
        break;
      }
      case "alternates": {
        const alternates = ensureArray(seoInput.alternates);
        for (const alternate of alternates) {
          if (!alternate) {
            continue;
          }
          const { language, url, default: defaultLang } = alternate;
          const hrefLang = language ? `${language}${defaultLang ? "-default" : ""}` : void 0;
          tagResults.push(
            generateTag("link", {
              rel: "alternate",
              hrefLang,
              href: url
            })
          );
        }
        break;
      }
      case "robots": {
        if (!seoInput.robots) {
          break;
        }
        const {
          maxImagePreview,
          maxSnippet,
          maxVideoPreview,
          noArchive,
          noFollow,
          noImageIndex,
          noIndex,
          noSnippet,
          noTranslate,
          unavailableAfter
        } = seoInput.robots;
        const robotsParams = [
          noArchive && "noarchive",
          noImageIndex && "noimageindex",
          noSnippet && "nosnippet",
          noTranslate && `notranslate`,
          maxImagePreview && `max-image-preview:${maxImagePreview}`,
          maxSnippet && `max-snippet:${maxSnippet}`,
          maxVideoPreview && `max-video-preview:${maxVideoPreview}`,
          unavailableAfter && `unavailable_after:${unavailableAfter}`
        ];
        let robotsParam = (noIndex ? "noindex" : "index") + "," + (noFollow ? "nofollow" : "follow");
        for (let param of robotsParams) {
          if (param) {
            robotsParam += `,${param}`;
          }
        }
        tagResults.push(
          generateTag("meta", { name: "robots", content: robotsParam })
        );
        break;
      }
    }
  }
  return tagResults.flat().sort((a, b) => a.key.localeCompare(b.key));
}
function generateTag(tagName, input, group) {
  const tag = { tag: tagName, props: {}, key: "" };
  if (tagName === "title") {
    tag.children = input.title;
    tag.key = generateKey(tag);
    return tag;
  }
  if (tagName === "script") {
    tag.children = typeof input.children === "string" ? input.children : "";
    tag.key = generateKey(tag, group);
    delete input.children;
    tag.props = input;
    return tag;
  }
  tag.props = input;
  Object.keys(tag.props).forEach(
    (key) => !tag.props[key] && delete tag.props[key]
  );
  tag.key = generateKey(tag, group);
  return tag;
}
function generateKey(tag, group) {
  const { tag: tagName, props } = tag;
  if (tagName === "title") {
    return "0-title";
  }
  if (tagName === "meta") {
    const priority = props.content === group && typeof props.property === "string" && !props.property.endsWith("secure_url") && "0";
    const groupName = [group, priority];
    return [tagName, ...groupName, props.property || props.name].filter((x) => x).join("-");
  }
  if (tagName === "link") {
    const key = [tagName, props.rel, props.hrefLang || props.media].filter((x) => x).join("-");
    return key.replace(/\s+/g, "-");
  }
  if (tagName === "script") {
    return `${tagName}-${group}`;
  }
  return `${tagName}-${props.type}`;
}
function renderTitle(template, title) {
  if (!title) {
    return void 0;
  }
  if (!template) {
    return title;
  }
  if (typeof template === "function") {
    return template(title);
  }
  return template.replace("%s", title ?? "");
}
function inferMimeType(url) {
  const ext = url && url.split(".").pop();
  switch (ext) {
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "swf":
      return "application/x-shockwave-flash";
    case "mp3":
      return "audio/mpeg";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}
function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}
function validate(schema2, data) {
  try {
    return schema2.validate(data);
  } catch (error) {
    console.warn(error.message);
    return data;
  }
}

// src/seo/getSeoMeta.ts
function getSeoMeta(...seoInputs) {
  let tagResults = [];
  const dedupedSeoInput = seoInputs.reduce((acc, current) => {
    if (!current) return acc;
    Object.keys(current).forEach(
      (key) => !current[key] && delete current[key]
    );
    const { jsonLd } = current;
    if (!jsonLd) {
      return { ...acc, ...current };
    }
    if (!acc?.jsonLd) {
      return { ...acc, ...current, jsonLd: [jsonLd] };
    } else {
      return {
        ...acc,
        ...current,
        jsonLd: ensureArray(acc.jsonLd).concat(jsonLd)
      };
    }
  }, {}) || {};
  for (const seoKey of Object.keys(dedupedSeoInput)) {
    switch (seoKey) {
      case "title": {
        const content = validate(schema.title, dedupedSeoInput.title);
        const title = renderTitle(dedupedSeoInput?.titleTemplate, content);
        if (!title) {
          break;
        }
        tagResults.push(
          { title },
          { property: "og:title", content: title },
          { property: "twitter:title", content: title }
        );
        break;
      }
      case "description": {
        const content = validate(
          schema.description,
          dedupedSeoInput.description
        );
        if (!content) {
          break;
        }
        tagResults.push(
          {
            name: "description",
            content
          },
          {
            property: "og:description",
            content
          },
          {
            property: "twitter:description",
            content
          }
        );
        break;
      }
      case "url": {
        const content = validate(schema.url, dedupedSeoInput.url);
        if (!content) {
          break;
        }
        const urlWithoutParams = content.split("?")[0];
        const urlWithoutTrailingSlash = urlWithoutParams.replace(/\/$/, "");
        tagResults.push(
          {
            tagName: "link",
            rel: "canonical",
            href: urlWithoutTrailingSlash
          },
          {
            property: "og:url",
            content: urlWithoutTrailingSlash
          }
        );
        break;
      }
      case "handle": {
        const content = validate(schema.handle, dedupedSeoInput.handle);
        if (!content) {
          break;
        }
        tagResults.push(
          { property: "twitter:site", content },
          { property: "twitter:creator", content }
        );
        break;
      }
      case "media": {
        let content;
        const values = ensureArray(dedupedSeoInput.media);
        for (const media of values) {
          if (typeof media === "string") {
            tagResults.push({ property: "og:image", content: media });
          }
          if (media && typeof media === "object") {
            const type = media.type || "image";
            const normalizedMedia = media ? {
              url: media?.url,
              secure_url: media?.url,
              type: inferMimeType(media.url),
              width: media?.width,
              height: media?.height,
              alt: media?.altText
            } : {};
            for (const key of Object.keys(normalizedMedia)) {
              if (normalizedMedia[key]) {
                content = normalizedMedia[key];
                tagResults.push({
                  property: `og:${type}:${key}`,
                  content
                });
              }
            }
          }
        }
        break;
      }
      case "jsonLd": {
        const jsonLdBlocks = ensureArray(dedupedSeoInput.jsonLd);
        for (const block of jsonLdBlocks) {
          if (typeof block !== "object" || Object.keys(block).length === 0) {
            continue;
          }
          tagResults.push({
            "script:ld+json": block
          });
        }
        break;
      }
      case "alternates": {
        const alternates = ensureArray(dedupedSeoInput.alternates);
        for (const alternate of alternates) {
          if (!alternate) {
            continue;
          }
          const { language, url, default: defaultLang } = alternate;
          const hrefLang = language ? `${language}${defaultLang ? "-default" : ""}` : void 0;
          tagResults.push({
            tagName: "link",
            rel: "alternate",
            hrefLang,
            href: url
          });
        }
        break;
      }
      case "robots": {
        if (!dedupedSeoInput.robots) {
          break;
        }
        const {
          maxImagePreview,
          maxSnippet,
          maxVideoPreview,
          noArchive,
          noFollow,
          noImageIndex,
          noIndex,
          noSnippet,
          noTranslate,
          unavailableAfter
        } = dedupedSeoInput.robots;
        const robotsParams = [
          noArchive && "noarchive",
          noImageIndex && "noimageindex",
          noSnippet && "nosnippet",
          noTranslate && `notranslate`,
          maxImagePreview && `max-image-preview:${maxImagePreview}`,
          maxSnippet && `max-snippet:${maxSnippet}`,
          maxVideoPreview && `max-video-preview:${maxVideoPreview}`,
          unavailableAfter && `unavailable_after:${unavailableAfter}`
        ];
        let robotsParam = (noIndex ? "noindex" : "index") + "," + (noFollow ? "nofollow" : "follow");
        for (let param of robotsParams) {
          if (param) {
            robotsParam += `,${param}`;
          }
        }
        tagResults.push({ name: "robots", content: robotsParam });
        break;
      }
    }
  }
  return tagResults;
}
var SeoLogger = lazy(() => import('./log-seo-tags-IG37ONQ2.js'));
function Seo({ debug }) {
  const matches = useMatches();
  const location = useLocation();
  console.warn(
    "[h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.\nSee: https://shopify.dev/docs/api/hydrogen/utilities/getseometa"
  );
  const seoConfig = useMemo(() => {
    return matches.flatMap((match) => {
      const { handle, ...routeMatch } = match;
      const routeData = { ...routeMatch, ...location };
      const handleSeo = handle?.seo;
      const loaderSeo = routeMatch?.data?.seo;
      if (!handleSeo && !loaderSeo) {
        return [];
      }
      if (handleSeo) {
        return recursivelyInvokeOrReturn(handleSeo, routeData);
      } else {
        return [loaderSeo];
      }
    }).reduce((acc, current) => {
      Object.keys(current).forEach(
        (key) => !current[key] && delete current[key]
      );
      const { jsonLd } = current;
      if (!jsonLd) {
        return { ...acc, ...current };
      }
      if (!acc?.jsonLd) {
        return { ...acc, ...current, jsonLd: [jsonLd] };
      } else {
        if (Array.isArray(jsonLd)) {
          return {
            ...acc,
            ...current,
            jsonLd: [...acc.jsonLd, ...jsonLd]
          };
        } else {
          return {
            ...acc,
            ...current,
            jsonLd: [...acc.jsonLd, jsonLd]
          };
        }
      }
    }, {});
  }, [matches, location]);
  const { html, loggerMarkup } = useMemo(() => {
    const headTags = generateSeoTags(seoConfig);
    const html2 = headTags.map((tag) => {
      if (tag.tag === "script") {
        return createElement(tag.tag, {
          ...tag.props,
          key: tag.key,
          dangerouslySetInnerHTML: { __html: tag.children }
        });
      }
      return createElement(tag.tag, { ...tag.props, key: tag.key }, tag.children);
    });
    const loggerMarkup2 = createElement(
      Suspense,
      { fallback: null },
      createElement(SeoLogger, { headTags })
    );
    return { html: html2, loggerMarkup: loggerMarkup2 };
  }, [seoConfig]);
  return createElement(Fragment$1, null, html, debug && loggerMarkup);
}
function recursivelyInvokeOrReturn(value, ...rest) {
  if (value instanceof Function) {
    return recursivelyInvokeOrReturn(value(...rest), ...rest);
  }
  let result = {};
  if (Array.isArray(value)) {
    result = value.reduce((acc, item) => {
      return [...acc, recursivelyInvokeOrReturn(item)];
    }, []);
    return result;
  }
  if (value instanceof Object) {
    const entries = Object.entries(value);
    entries.forEach(([key, val]) => {
      result[key] = recursivelyInvokeOrReturn(val, ...rest);
    });
    return result;
  }
  return value;
}
function ShopPayButton(props) {
  return /* @__PURE__ */ jsx(ShopPayButton$1, { channel: "hydrogen", ...props });
}

// src/sitemap/sitemap.ts
var SITEMAP_INDEX_PREFIX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
var SITEMAP_INDEX_SUFFIX = `
</sitemapindex>`;
var SITEMAP_PREFIX = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`;
var SITEMAP_SUFFIX = `</urlset>`;
async function getSitemapIndex(options) {
  const {
    storefront,
    request,
    types = [
      "products",
      "pages",
      "collections",
      "metaObjects",
      "articles",
      "blogs"
    ],
    customChildSitemaps = []
  } = options;
  if (!request || !request.url)
    throw new Error("A request object is required to generate a sitemap index");
  if (!storefront || !storefront.query)
    throw new Error(
      "A storefront client is required to generate a sitemap index"
    );
  const data = await storefront.query(SITEMAP_INDEX_QUERY);
  if (!data) {
    console.warn(
      "[h2:sitemap:warning] Sitemap index is available in API version 2024-10 and later"
    );
    throw new Response("Sitemap index not found.", { status: 404 });
  }
  const baseUrl = new URL(request.url).origin;
  const body = SITEMAP_INDEX_PREFIX + types.map((type) => {
    if (!data[type]) {
      throw new Error(
        `[h2:sitemap:error] No data found for type ${type}. Check types passed to \`getSitemapIndex\``
      );
    }
    return getSiteMapLinks(type, data[type].pagesCount.count, baseUrl);
  }).join("\n") + customChildSitemaps.map(
    (url) => "  <sitemap><loc>" + (baseUrl + (url.startsWith("/") ? url : "/" + url)) + "</loc></sitemap>"
  ).join("\n") + SITEMAP_INDEX_SUFFIX;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": `max-age=${60 * 60 * 24}`
    }
  });
}
async function getSitemap(options) {
  const {
    storefront,
    request,
    params,
    getLink,
    locales = [],
    getChangeFreq,
    noItemsFallback = "/"
  } = options;
  if (!params)
    throw new Error(
      "[h2:sitemap:error] Remix params object is required to generate a sitemap"
    );
  if (!request || !request.url)
    throw new Error("A request object is required to generate a sitemap");
  if (!storefront || !storefront.query)
    throw new Error("A storefront client is required to generate a index");
  if (!getLink)
    throw new Error(
      "A `getLink` function to generate each resource is required to build a sitemap"
    );
  if (!params.type || !params.page)
    throw new Response("No data found", { status: 404 });
  const type = params.type;
  const query = QUERIES[type];
  if (!query) throw new Response("Not found", { status: 404 });
  const data = await storefront.query(query, {
    variables: {
      page: parseInt(params.page, 10)
    }
  });
  if (!data) {
    console.warn(
      "[h2:sitemap:warning] Sitemap is available in API version 2024-10 and later"
    );
    throw new Response("Sitemap not found.", { status: 404 });
  }
  const baseUrl = new URL(request.url).origin;
  let body = "";
  if (!data?.sitemap?.resources?.items?.length) {
    body = SITEMAP_PREFIX + `
  <url><loc>${baseUrl + noItemsFallback}</loc></url>
` + SITEMAP_SUFFIX;
  } else {
    body = SITEMAP_PREFIX + data.sitemap.resources.items.map((item) => {
      return renderUrlTag({
        getChangeFreq,
        url: getLink({
          type: item.type ?? type,
          baseUrl,
          handle: item.handle
        }),
        type,
        getLink,
        updatedAt: item.updatedAt,
        handle: item.handle,
        metaobjectType: item.type,
        locales,
        baseUrl
      });
    }).join("\n") + SITEMAP_SUFFIX;
  }
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": `max-age=${60 * 60 * 24}`
    }
  });
}
function getSiteMapLinks(resource, count, baseUrl) {
  let links = ``;
  for (let i = 1; i <= count; i++) {
    links += `  <sitemap><loc>${baseUrl}/sitemap/${resource}/${i}.xml</loc></sitemap>
`;
  }
  return links;
}
function renderUrlTag({
  url,
  updatedAt,
  locales,
  type,
  getLink,
  baseUrl,
  handle,
  getChangeFreq,
  metaobjectType
}) {
  return `<url>
  <loc>${url}</loc>
  <lastmod>${updatedAt}</lastmod>
  <changefreq>${getChangeFreq ? getChangeFreq({ type: metaobjectType ?? type, handle }) : "weekly"}</changefreq>
${locales.map(
    (locale) => renderAlternateTag(
      getLink({ type: metaobjectType ?? type, baseUrl, handle, locale }),
      locale
    )
  ).join("\n")}
</url>
  `.trim();
}
function renderAlternateTag(url, locale) {
  return `  <xhtml:link rel="alternate" hreflang="${locale}" href="${url}" />`;
}
var PRODUCT_SITEMAP_QUERY = `#graphql
    query SitemapProducts($page: Int!) {
      sitemap(type: PRODUCT) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`;
var COLLECTION_SITEMAP_QUERY = `#graphql
    query SitemapCollections($page: Int!) {
      sitemap(type: COLLECTION) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`;
var ARTICLE_SITEMAP_QUERY = `#graphql
    query SitemapArticles($page: Int!) {
      sitemap(type: ARTICLE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`;
var PAGE_SITEMAP_QUERY = `#graphql
    query SitemapPages($page: Int!) {
      sitemap(type: PAGE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`;
var BLOG_SITEMAP_QUERY = `#graphql
    query SitemapBlogs($page: Int!) {
      sitemap(type: BLOG) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`;
var METAOBJECT_SITEMAP_QUERY = `#graphql
    query SitemapMetaobjects($page: Int!) {
      sitemap(type: METAOBJECT) {
        resources(page: $page) {
          items {
            handle
            updatedAt
            ... on SitemapResourceMetaobject {
              type
            }
          }
        }
      }
    }
`;
var SITEMAP_INDEX_QUERY = `#graphql
query SitemapIndex {
  products: sitemap(type: PRODUCT) {
    pagesCount {
      count
    }
  }
  collections: sitemap(type: COLLECTION) {
    pagesCount {
      count
    }
  }
  articles: sitemap(type: ARTICLE) {
    pagesCount {
      count
    }
  }
  pages: sitemap(type: PAGE) {
    pagesCount {
      count
    }
  }
  blogs: sitemap(type: BLOG) {
    pagesCount {
      count
    }
  }
  metaObjects: sitemap(type: METAOBJECT) {
    pagesCount {
      count
    }
  }
}
`;
var QUERIES = {
  products: PRODUCT_SITEMAP_QUERY,
  articles: ARTICLE_SITEMAP_QUERY,
  collections: COLLECTION_SITEMAP_QUERY,
  pages: PAGE_SITEMAP_QUERY,
  blogs: BLOG_SITEMAP_QUERY,
  metaObjects: METAOBJECT_SITEMAP_QUERY
};
//! @see https://shopify.dev/docs/api/storefront/latest/queries/cart
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesUpdate
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesRemove
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartSelectedDeliveryOptionsUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
//! @see https://shopify.dev/docs/api/storefront/2025-07/mutations/cartMetafieldDelete
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesRemove
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesAdd
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesRemove
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesUpdate

export { Analytics, AnalyticsEvent, CacheCustom, CacheLong, CacheNone, CacheShort, CartForm, InMemoryCache, NonceProvider, OptimisticInput, Pagination, RichText, Script, Seo, ShopPayButton, VariantSelector, cartAttributesUpdateDefault, cartBuyerIdentityUpdateDefault, cartCreateDefault, cartDiscountCodesUpdateDefault, cartGetDefault, cartGetIdDefault, cartGiftCardCodesRemoveDefault, cartGiftCardCodesUpdateDefault, cartLinesAddDefault, cartLinesRemoveDefault, cartLinesUpdateDefault, cartMetafieldDeleteDefault, cartMetafieldsSetDefault, cartNoteUpdateDefault, cartSelectedDeliveryOptionsUpdateDefault, cartSetIdDefault, changelogHandler, createCartHandler, createContentSecurityPolicy, createCustomerAccountClient, createHydrogenContext, createStorefrontClient, createWithCache, formatAPIResult, generateCacheControlHeader, getPaginationVariables, getSelectedProductOptions, getSeoMeta, getShopAnalytics, getSitemap, getSitemapIndex, graphiqlLoader, hydrogenContext, hydrogenPreset, hydrogenRoutes, storefrontRedirect, useAnalytics, useCustomerPrivacy, useNonce, useOptimisticCart, useOptimisticData, useOptimisticVariant };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map