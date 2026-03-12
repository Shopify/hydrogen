// Import React Router type augmentations to ensure they're loaded
/// <reference path="../react-router.d.ts" />

export {
  Analytics,
  getShopAnalytics,
  type ShopAnalytics,
  useAnalytics,
} from './analytics-manager/AnalyticsProvider';
export {
  type CartLineUpdatePayload,
  type CartUpdatePayload,
  type CartViewPayload,
  type CollectionViewPayload,
  type PageViewPayload,
  type ProductViewPayload,
  type SearchViewPayload,
} from './analytics-manager/AnalyticsView';
export {AnalyticsEvent} from './analytics-manager/events';
export {
  type CartActionInput,
  CartForm,
  type OptimisticCartLineInput,
} from './cart/CartForm';
export {changelogHandler} from './changelogHandler';
export * from './core';
export {createWithCache, type WithCache} from './core/cache/create-with-cache';
export {InMemoryCache} from './core/cache/in-memory';
export {type CacheKey} from './core/cache/run-with-cache';
export {
  CacheCustom,
  CacheLong,
  CacheNone,
  CacheShort,
  type CachingStrategy,
  generateCacheControlHeader,
  type NoStoreStrategy,
} from './core/cache/strategies';
export {cartGetIdDefault} from './core/cart/cartGetIdDefault';
export {
  cartSetIdDefault,
  type CookieOptions,
} from './core/cart/cartSetIdDefault';
export {
  createCartHandler,
  type HydrogenCart,
  type HydrogenCartCustom,
} from './core/cart/createCartHandler';
export {
  type OptimisticCart,
  type OptimisticCartLine,
  useOptimisticCart,
} from './core/cart/optimistic/useOptimisticCart';
export type {
  CartQueryDataReturn,
  CartQueryOptions,
  CartQueryReturn,
  CartReturn,
  MetafieldWithoutOwnerId,
} from './core/cart/queries/cart-types';
export {cartAttributesUpdateDefault} from './core/cart/queries/cartAttributesUpdateDefault';
export {cartBuyerIdentityUpdateDefault} from './core/cart/queries/cartBuyerIdentityUpdateDefault';
export {cartCreateDefault} from './core/cart/queries/cartCreateDefault';
export {cartDiscountCodesUpdateDefault} from './core/cart/queries/cartDiscountCodesUpdateDefault';
export {cartGetDefault} from './core/cart/queries/cartGetDefault';
export {cartGiftCardCodesAddDefault} from './core/cart/queries/cartGiftCardCodesAddDefault';
export {cartGiftCardCodesRemoveDefault} from './core/cart/queries/cartGiftCardCodesRemoveDefault';
export {cartGiftCardCodesUpdateDefault} from './core/cart/queries/cartGiftCardCodeUpdateDefault';
export {cartLinesAddDefault} from './core/cart/queries/cartLinesAddDefault';
export {cartLinesRemoveDefault} from './core/cart/queries/cartLinesRemoveDefault';
export {cartLinesUpdateDefault} from './core/cart/queries/cartLinesUpdateDefault';
export {cartMetafieldDeleteDefault} from './core/cart/queries/cartMetafieldDeleteDefault';
export {cartMetafieldsSetDefault} from './core/cart/queries/cartMetafieldsSetDefault';
export {cartNoteUpdateDefault} from './core/cart/queries/cartNoteUpdateDefault';
export {cartSelectedDeliveryOptionsUpdateDefault} from './core/cart/queries/cartSelectedDeliveryOptionsUpdateDefault';
export {createCustomerAccountClient} from './core/customer/customer';
export type {
  CustomerAccount,
  CustomerAccountMutations,
  CustomerAccountQueries,
} from './core/customer/types';
export {createRequestHandler} from './createRequestHandler';
export {createContentSecurityPolicy, NonceProvider, useNonce} from './csp/csp';
export {Script} from './csp/Script';
export {
  type ConsentStatus,
  type CustomerPrivacy,
  type CustomerPrivacyApiProps,
  type CustomerPrivacyConsentConfig,
  type CustomEventMap,
  type PrivacyBanner,
  type SetConsentHeadlessParams,
  useCustomerPrivacy,
  type VisitorConsent,
  type VisitorConsentCollected,
} from './customer-privacy/ShopifyCustomerPrivacy';
export {hydrogenRoutes} from './dev/hydrogen-routes';
export {
  OptimisticInput,
  useOptimisticData,
} from './optimistic-ui/optimistic-ui';
export {getPaginationVariables, Pagination} from './pagination/Pagination';
export {useOptimisticVariant} from './product/useOptimisticVariant';
export type {
  VariantOption,
  VariantOptionValue,
} from './product/VariantSelector';
export {
  getSelectedProductOptions,
  VariantSelector,
} from './product/VariantSelector';
export {hydrogenPreset} from './react-router-preset';
export {RichText} from './RichText';
export {graphiqlLoader} from './routing/graphiql';
export {storefrontRedirect} from './routing/redirect';
export {type SeoConfig} from './seo/generate-seo-tags';
export {getSeoMeta} from './seo/getSeoMeta';
export type {SeoHandleFunction} from './seo/seo';
export {Seo} from './seo/seo';
export {ShopPayButton} from './shop/ShopPayButton';
export {getSitemap, getSitemapIndex} from './sitemap/sitemap';
export type {
  HydrogenEnv,
  HydrogenRouterContextProvider,
  HydrogenSession,
  HydrogenSessionData,
} from './types';
export type {
  ClientBrowserParameters,
  MappedProductOptions,
  ParsedMetafields,
  // TODO: document this change
  ShopifyAnalytics as SendShopifyAnalyticsEvent,
  ShopifyAddToCart,
  ShopifyAddToCartPayload,
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
export {
  AnalyticsEventName,
  AnalyticsPageType,
  customerAccountApiCustomScalars,
  decodeEncodedVariant,
  ExternalVideo,
  flattenConnection,
  getAdjacentAndFirstAvailableVariants,
  getClientBrowserParameters,
  getProductOptions,
  getShopifyCookies,
  getTrackingValues,
  Image,
  IMAGE_FRAGMENT,
  isOptionValueCombinationInEncodedVariant,
  mapSelectedProductOptionToObject,
  MediaFile,
  ModelViewer,
  Money,
  parseGid,
  parseMetafield,
  sendShopifyAnalytics,
  ShopifySalesChannel,
  storefrontApiCustomScalars,
  useLoadScript,
  useMoney,
  useSelectedOptionInUrlParam,
  useShopifyCookies,
  Video,
} from '@shopify/hydrogen-react';
