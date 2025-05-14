# Markets

This recipe shows how to add support for [Shopify
Markets](https://www.shopify.com/ca/blog/markets) to your Hydrogen app.

Markets allow you to segment your audience and serve different content to each
market.

You can set up Markets and use them in a variety of ways; in this recipe,
you'll learn how to set up basic localization support for your Hydrogen store,
understand what options are available for routing, and how to add a country
selector component to your app and how to set up links that work across
localized versions of your store.


> [!NOTE]
> This recipe is particularly useful for existing Hydrogen projects. If you need to set up a brand new Hydrogen app, you can get a solid foundation by selecting the localization options when setting up your new project via the Shopify CLI. You can also use `h2 setup markets` to add localization support to your new Hydrogen app.

## Requirements

- Set up your store's regions and languages via [Shopify Markets](https://help.shopify.com/en/manual/markets).
- Configure your products appropriately for each market.
- Make sure your Hydrogen app is configured to use a default `language` and `country code`. They will be used as the fallback when no market is explicitly selected.


## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/CountrySelector.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/CountrySelector.tsx) | A component that displays a country selector inside the Header. |
| [app/components/Link.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/Link.tsx) | A wrapper around the Remix Link component that uses the selected locale path prefix. |
| [app/lib/i18n.ts](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/lib/i18n.ts) | A helper function to get locale information from the context, a hook to retrieve the selected locale, and a list of available locales. |
| [app/routes/($locale)._index.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale)._index.tsx) | A route that renders a localized version of the home page. |
| [app/routes/($locale).cart.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).cart.tsx) | A localized cart route. |
| [app/routes/($locale).products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).products.$handle.tsx) | A route that renders a localized version of the product page. |

## Steps

### Step 1: Path-based localization, subdomain-based localization, …?

There are several ways to implement localization in your Shopify Hydrogen store, and the approach you take will depend on your project's requirements.

Each localization method offers different trade-offs:

**URL-Based Localization (Recommended)**

URL-based approaches make market information visible in the URL, which provides two key benefits:
- It's transparent to search engine crawlers
- It allows each localized version of your store to be properly indexed

This approach can be implemented usually in two ways:

1. Path-Based Localization
    - **Example:** `example.com/fr-ca/products`
    - **Implementation:** Requires adding a locale parameter to your routes
      - Rename `routes/_index.tsx` to `routes/($locale)._index.tsx`
    - **Advantages:** No infrastructure changes needed
    - **Considerations:** Requires additional code to handle link formatting throughout your application
2. Subdomain or Top-Level Domain Localization
    - **Example:** `fr-ca.example.com/products` (or `example.fr/products`)
    - **Implementation:** Requires infrastructure configuration
    - **Advantages:** Maintains consistent URL structure across localized stores
    - **Considerations:** More complex setup at the infrastructure level

**Alternative Approaches**

While you could use other methods like cookies or HTTP headers for localization, these approaches have a significant disadvantage: they're not visible to search engine crawlers, which can negatively impact your SEO for different markets.

💡 _**For the remainder of this recipe, we'll focus on implementing path-based localization.**_


### Step 2: Add language splat to the desired route's

If you're going with path-based localization, you should add a language
splat to your localized routes, for example renaming `routes/_index.tsx`
to `routes/($locale)._index.tsx`.

For brevity, in this example we only focused on two files – the index page
and the product page; however this should be done for all the app routes.


### Step 3: Add ingredients to your project

Copy all the files found in the `ingredients/` directory into your project.

- [app/components/CountrySelector.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/CountrySelector.tsx)
- [app/components/Link.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/Link.tsx)
- [app/lib/i18n.ts](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/lib/i18n.ts)
- [app/routes/($locale)._index.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale)._index.tsx)
- [app/routes/($locale).cart.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).cart.tsx)
- [app/routes/($locale).products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).products.$handle.tsx)

### Step 4: Add language splat to the desired route's

If you're going with path-based localization, you should add a language splat to your localized routes, for example renaming `routes/_index.tsx` to `routes/($locale)._index.tsx`.

For brevity, in this example we only focused on two files – the index page and the product page; however this should be done for all the app routes.


### Step 5: Use the new Link component in the ProductItem component

Update the `ProductItem` component to use the `Link` component from the `app/components/Link.tsx` file.


#### File: [app/components/ProductItem.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/app/components/ProductItem.tsx)

```diff
index 62c64b50..81ff9ec9 100644
--- a/templates/skeleton/app/components/ProductItem.tsx
+++ b/templates/skeleton/app/components/ProductItem.tsx
@@ -1,4 +1,3 @@
-import {Link} from '@remix-run/react';
 import {Image, Money} from '@shopify/hydrogen';
 import type {
   ProductItemFragment,
@@ -6,6 +5,7 @@ import type {
   RecommendedProductFragment,
 } from 'storefrontapi.generated';
 import {useVariantUrl} from '~/lib/variants';
+import {Link} from './Link';
 
 export function ProductItem({
   product,
```

### Step 6: Add the CountrySelector component to the Header

Add a CountrySelector component to the Header.


#### File: [app/components/Header.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/app/components/Header.tsx)

```diff
index 8a437a10..757808eb 100644
--- a/templates/skeleton/app/components/Header.tsx
+++ b/templates/skeleton/app/components/Header.tsx
@@ -7,6 +7,7 @@ import {
 } from '@shopify/hydrogen';
 import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
+import {CountrySelector} from './CountrySelector';
 
 interface HeaderProps {
   header: HeaderQuery;
@@ -77,6 +78,7 @@ export function HeaderMenu({
           item.url.includes(primaryDomainUrl)
             ? new URL(item.url).pathname
             : item.url;
+
         return (
           <NavLink
             className="header-menu-item"
@@ -102,6 +104,7 @@ function HeaderCtas({
   return (
     <nav className="header-ctas" role="navigation">
       <HeaderMenuMobileToggle />
+      <CountrySelector />
       <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
         <Suspense fallback="Sign in">
           <Await resolve={isLoggedIn} errorElement="Sign in">
```

### Step 7: Add the selected locale to the context

Detect the locale from the URL path, and add it to the Hydrogencontext.


#### File: [app/lib/context.ts](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/app/lib/context.ts)

```diff
index c424c511..b5d3737a 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,6 +1,7 @@
 import {createHydrogenContext} from '@shopify/hydrogen';
 import {AppSession} from '~/lib/session';
 import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
+import {getLocaleFromRequest} from './i18n';
 
 /**
  * The context implementation is separate from server.ts
@@ -24,13 +25,15 @@ export async function createAppLoadContext(
     AppSession.init(request, [env.SESSION_SECRET]),
   ]);
 
+  const i18n = getLocaleFromRequest(request);
+
   const hydrogenContext = createHydrogenContext({
     env,
     request,
     cache,
     waitUntil,
     session,
-    i18n: {language: 'EN', country: 'US'},
+    i18n,
     cart: {
       queryFragment: CART_QUERY_FRAGMENT,
     },
```

### Step 8: Add the selected locale to the root route

- Include the selected locale in the root route's loader data.

- Add a key prop to the `PageLayout` component to make sure it re-renders
when the locale changes.


#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/app/root.tsx)

```diff
index 3426476a..4f67b72b 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -74,9 +74,12 @@ export async function loader(args: LoaderFunctionArgs) {
 
   const {storefront, env} = args.context;
 
+  const {i18n} = storefront;
+
   return {
     ...deferredData,
     ...criticalData,
+    selectedLocale: args.context.storefront.i18n,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
       storefront,
@@ -87,8 +90,8 @@ export async function loader(args: LoaderFunctionArgs) {
       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
       withPrivacyBanner: false,
       // localize the privacy banner
-      country: args.context.storefront.i18n.country,
-      language: args.context.storefront.i18n.language,
+      country: i18n.country,
+      language: i18n.language,
     },
   };
 }
@@ -105,6 +108,8 @@ async function loadCriticalData({context}: LoaderFunctionArgs) {
       cache: storefront.CacheLong(),
       variables: {
         headerMenuHandle: 'main-menu', // Adjust to your header menu handle
+        country: storefront.i18n.country,
+        language: storefront.i18n.language,
       },
     }),
     // Add other queries here, so that they are loaded in parallel
@@ -162,7 +167,12 @@ export function Layout({children}: {children?: React.ReactNode}) {
             shop={data.shop}
             consent={data.consent}
           >
-            <PageLayout {...data}>{children}</PageLayout>
+            <PageLayout
+              key={`${data.selectedLocale.language}-${data.selectedLocale.country}`}
+              {...data}
+            >
+              {children}
+            </PageLayout>
           </Analytics.Provider>
         ) : (
           children
```

## Deleted Files

- [templates/skeleton/app/routes/_index.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/templates/skeleton/app/routes/_index.tsx)
- [templates/skeleton/app/routes/cart.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/templates/skeleton/app/routes/cart.tsx)
- [templates/skeleton/app/routes/products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/bd55b241191304945704c0b9ef278e945c55d3da/templates/skeleton/templates/skeleton/app/routes/products.$handle.tsx)