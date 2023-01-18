---
'@shopify/storefront-kit-react': patch
---

Shopify Analytics

Methods:

- `useShopifyCookies(hasUserConsent = true, domain = ''): void` - sets and refreshes Shopify cookies
- `getShopifyCookie(cookieString: string): ShopifyCookie` - returns Shopify cookies
- `sendShopifyAnalytics({eventName: AnalyticsEventName, payload: ShopifyAnalytics}, domain?): Promise<void>` - sends Shopify analytics
- `getClientBrowserParameters(): ClientBrowserParameters` - returns commonly tracked client browser values

Constants:

- `AnalyticsEventName` - list of Shopify accepted analytics events
- `AnalyticsPageType` - list of Shopify accepted page type names
- `ShopifyAppSource` - list of Shopify accepted application source

Types:

- `ShopifyCookies`
- `ClientBrowserParameters`
- `ShopifyAnalytics` - generic type for `ShopifyPageView` and `ShopifyAddToCart`
- `ShopifyAnalyticsPayload` - generic type for `ShopifyPageViewPayload` and `ShopifyAddToCartPayload`
- `ShopifyPageView`
- `ShopifyPageViewPayload`
- `ShopifyAddToCart`
- `ShopifyAddToCartPayload`
- `ShopifyAnalyticsProduct`
