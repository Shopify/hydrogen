export * from './storefront';
export * from './with-cache';
export {
  CacheCustom,
  CacheLong,
  CacheNone,
  CacheShort,
  generateCacheControlHeader,
  type CachingStrategy,
  type NoStoreStrategy,
} from './cache/strategies';
export {InMemoryCache} from './cache/in-memory';
export {type CacheKey} from './cache/fetch';

export {storefrontRedirect} from './routing/redirect';
export {graphiqlLoader} from './routing/graphiql';
export {Seo} from './seo/seo';
export {type SeoConfig} from './seo/generate-seo-tags';
export type {SeoHandleFunction} from './seo/seo';
export {Pagination, getPaginationVariables} from './pagination/Pagination';
export {createCustomerAccountClient} from './customer/customer';
export type {
  CustomerAccount,
  // CustomerClient is a deprecated type that will be remove after 2024-01
  CustomerAccount as CustomerClient,
  CustomerAccountQueries,
  CustomerAccountMutations,
} from './customer/types';
export {changelogHandler} from './changelogHandler';

export {CartForm, type CartActionInput} from './cart/CartForm';
export {cartCreateDefault} from './cart/queries/cartCreateDefault';
export {cartGetDefault} from './cart/queries/cartGetDefault';
export {cartLinesAddDefault} from './cart/queries/cartLinesAddDefault';
export {cartLinesUpdateDefault} from './cart/queries/cartLinesUpdateDefault';
export {cartLinesRemoveDefault} from './cart/queries/cartLinesRemoveDefault';
export {cartDiscountCodesUpdateDefault} from './cart/queries/cartDiscountCodesUpdateDefault';
export {cartBuyerIdentityUpdateDefault} from './cart/queries/cartBuyerIdentityUpdateDefault';
export {cartNoteUpdateDefault} from './cart/queries/cartNoteUpdateDefault';
export {cartSelectedDeliveryOptionsUpdateDefault} from './cart/queries/cartSelectedDeliveryOptionsUpdateDefault';
export {cartAttributesUpdateDefault} from './cart/queries/cartAttributesUpdateDefault';
export {cartMetafieldsSetDefault} from './cart/queries/cartMetafieldsSetDefault';
export {cartMetafieldDeleteDefault} from './cart/queries/cartMetafieldDeleteDefault';
export {cartGetIdDefault} from './cart/cartGetIdDefault';
export {cartSetIdDefault, type CookieOptions} from './cart/cartSetIdDefault';
export {
  type HydrogenCartCustom,
  type HydrogenCart,
  createCartHandler,
} from './cart/createCartHandler';
export type {
  MetafieldWithoutOwnerId,
  CartReturn,
  CartQueryDataReturn,
  CartQueryOptions,
  CartQueryReturn,
} from './cart/queries/cart-types';

export {
  VariantSelector,
  getSelectedProductOptions,
} from './product/VariantSelector';

export type {
  VariantOption,
  VariantOptionValue,
} from './product/VariantSelector';

export {createContentSecurityPolicy, useNonce} from './csp/csp';
export {Script} from './csp/Script';

export {
  useOptimisticData,
  OptimisticInput,
} from './optimistic-ui/optimistic-ui';

export {ShopPayButton} from './shop/ShopPayButton';

export {Analytics, useAnalytics} from './analytics-manager/AnalyticsProvider';
export {CartAnalytics} from './analytics-manager/CartAnalytics';
export {AnalyticsEvent} from './analytics-manager/events';
export {ShopifyAnalytics} from './analytics-manager/ShopifyAnalytics';;
export {
  type PageViewPayload,
  type ProductViewPayload,
  type CollectionViewPayload,
  type CartViewPayload,
  type CartUpdatePayload,
} from './analytics-manager/AnalyticsView';

export {
  type ConsentStatus,
  type VisitorConsent,
  type VisitorConsentCollected,
  type CustomerPrivacyConsentConfig,
  type SetConsentHeadlessParams,
  type CustomerPrivacy,
  type PrivacyBanner,
  type CustomEventMap,
  type PrivacyConsentBannerProps,
  type CustomerPrivacyApiProps,
  useCustomerPrivacy,
  getCustomerPrivacy,
  getCustomerPrivacyRequired,
} from './customer-privacy/ShopifyCustomerPrivacy';

export {
  AnalyticsEventName,
  AnalyticsPageType,
  ExternalVideo,
  flattenConnection,
  getClientBrowserParameters,
  getShopifyCookies,
  Image,
  IMAGE_FRAGMENT,
  MediaFile,
  ModelViewer,
  Money,
  parseGid,
  parseMetafield,
  sendShopifyAnalytics,
  ShopifySalesChannel,
  storefrontApiCustomScalars,
  customerAccountApiCustomScalars,
  useLoadScript,
  useMoney,
  useShopifyCookies,
  Video,
} from '@shopify/hydrogen-react';

export type {
  ClientBrowserParameters,
  ParsedMetafields,
  ShopifyAddToCart,
  ShopifyAddToCartPayload,
  // TODO: document this change
  ShopifyAnalytics as SendShopifyAnalyticsEvent,
  ShopifyAnalyticsPayload,
  ShopifyAnalyticsProduct,
  ShopifyCookies,
  ShopifyPageView,
  ShopifyPageViewPayload,
  StorefrontApiResponse,
  StorefrontApiResponseError,
  StorefrontApiResponseOk,
  StorefrontApiResponseOkPartial,
  StorefrontApiResponsePartial,
} from '@shopify/hydrogen-react';

export type {HydrogenSessionData, HydrogenSession} from './hydrogen';
