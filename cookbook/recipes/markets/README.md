# Markets in Hydrogen

This recipe shows how to add support for [Shopify
Markets](https://shopify.dev/docs/apps/build/markets) to your Hydrogen app. Markets
let you segment your audience based on location and serve different content to each market.

You can use Markets in a variety of ways. In this recipe,
you'll set up basic localization support for your Hydrogen store,
learn what options are available for routing, add a country
selector component to your app, and set up links that work across
localized versions of your store.

There are several ways to implement localization in your Shopify Hydrogen
store, and the approach you take will depend on your project's
requirements. This recipe uses **URL-based localization**, which makes
market information visible in the URL. This provides two key benefits:

- It's transparent to search engine crawlers.
- It allows each localized version of your store to be properly indexed.

This approach is typically implemented in two ways:

1. Path-based localization (recommended)
    - **Example:** `example.com/fr-ca/products`
    - **Implementation:** Requires adding a locale parameter to your routes
      - Rename `routes/_index.tsx` to `routes/($locale)._index.tsx`
    - **Advantages:** No infrastructure changes needed
    - **Considerations:** Requires additional code to handle link formatting throughout your application
2. Subdomain or top-level domain localization
    - **Example:** `fr-ca.example.com/products` (or `example.fr/products`)
    - **Implementation:** Requires infrastructure configuration
    - **Advantages:** Maintains consistent URL structure across localized stores
    - **Considerations:** More complex setup at the infrastructure level

Although you can use other methods for localization (like cookies or HTTP headers),
these approaches have one significant disadvantage: they're
not visible to search engine crawlers. This can negatively impact your
SEO for different markets.

In this recipe, we'll implement **path-based localization**.

> [!NOTE]
> This recipe is particularly useful for existing Hydrogen projects. If you need to set up a brand new Hydrogen app, you can get a solid foundation by selecting the localization options when setting up your new project using the Shopify CLI. You can also use `h2 setup markets` to add localization support to your new Hydrogen app.

## Requirements

- Set up your store's regions and languages using [Shopify
Markets](https://help.shopify.com/en/manual/markets).
- Configure your products appropriately for each market.
- Make sure your Hydrogen app is configured to use a default `language` and
`country code`. They will be used as the fallback when no market is explicitly
selected.

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/CountrySelector.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/CountrySelector.tsx) | A component that displays a country selector inside the Header. |
| [app/components/Link.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/Link.tsx) | A unified locale-aware Link component that handles both regular links and navigation links with active states. Automatically prepends locale prefixes and cleans menu URLs. |
| [app/lib/i18n.ts](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/lib/i18n.ts) | Comprehensive i18n utilities including locale detection, path transformation hooks, URL cleaning functions, and locale validation. Centralizes all localization logic in one place. |
| [app/routes/($locale)._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale)._index.tsx) | A route that renders a localized version of the home page. |
| [app/routes/($locale).account.$.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.$.tsx) | Fallback route for unauthenticated account pages with locale support |
| [app/routes/($locale).account._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account._index.tsx) | Localized account dashboard redirect route |
| [app/routes/($locale).account.addresses.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.addresses.tsx) | Customer address management page with locale-aware forms and links |
| [app/routes/($locale).account.orders.$id.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.orders.$id.tsx) | Individual order details page with localized currency and date formatting |
| [app/routes/($locale).account.orders._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.orders._index.tsx) | Customer order history listing with locale-specific pagination |
| [app/routes/($locale).account.profile.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.profile.tsx) | Customer profile editing form with localized field labels |
| [app/routes/($locale).account.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.tsx) | Account layout wrapper with locale-aware navigation tabs |
| [app/routes/($locale).account_.authorize.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.authorize.tsx) | OAuth authorization callback route with locale preservation |
| [app/routes/($locale).account_.login.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.login.tsx) | Customer login redirect with locale-specific return URL |
| [app/routes/($locale).account_.logout.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.logout.tsx) | Logout handler that maintains locale after sign out |
| [app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx) | Blog article page with locale-specific content and SEO metadata |
| [app/routes/($locale).blogs.$blogHandle._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs.$blogHandle._index.tsx) | Blog listing page with localized article previews and pagination |
| [app/routes/($locale).blogs._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs._index.tsx) | All blogs overview page with locale-aware navigation links |
| [app/routes/($locale).cart.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).cart.tsx) | A localized cart route. |
| [app/routes/($locale).collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections.$handle.tsx) | Collection page displaying products with locale-specific pricing and availability |
| [app/routes/($locale).collections._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections._index.tsx) | Collections listing page with localized collection names and images |
| [app/routes/($locale).collections.all.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections.all.tsx) | All products page with locale-based filtering and sorting |
| [app/routes/($locale).pages.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).pages.$handle.tsx) | Dynamic page route for locale-specific content pages |
| [app/routes/($locale).policies.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).policies.$handle.tsx) | Policy page (privacy, terms, etc.) with locale-specific legal content |
| [app/routes/($locale).policies._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).policies._index.tsx) | Policies index page listing all available store policies |
| [app/routes/($locale).products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).products.$handle.tsx) | A route that renders a localized version of the product page. |
| [app/routes/($locale).search.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).search.tsx) | Search results page with locale-aware product matching and predictive search |
| [app/routes/($locale).tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).tsx) | A utility route that makes sure the locale is valid. |

## Steps

### Step 1: Add localization utilities and update core components

In this section, we'll create utilities to handle localization and country selection, and update the core components to use these utilities.

#### Step 1.1: Update CartLineItem with locale-aware product links

Update cart line items to use the unified Link component for product links.

##### File: [app/components/CartLineItem.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/components/CartLineItem.tsx)

~~~diff
index 80e34be2..bd520a03 100644
--- a/templates/skeleton/app/components/CartLineItem.tsx
+++ b/templates/skeleton/app/components/CartLineItem.tsx
@@ -2,7 +2,7 @@ import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
 import type {CartLayout} from '~/components/CartMain';
 import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
 import {useVariantUrl} from '~/lib/variants';
-import {Link} from 'react-router';
+import {Link} from '~/components/Link';
 import {ProductPrice} from './ProductPrice';
 import {useAside} from './Aside';
 import type {CartApiQueryFragment} from 'storefrontapi.generated';
~~~

#### Step 1.2: Create a CountrySelector component

Create a new `CountrySelector` component that allows users to select the locale from a dropdown of the supported locales.

To handle redirects, use a `Form` that updates the cart buyer identity,
which eventually redirects to the localized root of the app.

##### File: [CountrySelector.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/CountrySelector.tsx)

<details>

~~~tsx
import {Form, useLocation} from 'react-router';
import type {Locale} from '../lib/i18n';
import {
  SUPPORTED_LOCALES,
  useSelectedLocale,
  getPathWithoutLocale,
} from '../lib/i18n';
import {CartForm} from '@shopify/hydrogen';

export function CountrySelector() {
  const selectedLocale = useSelectedLocale();

  const label =
    selectedLocale != null
      ? `${selectedLocale.language}-${selectedLocale.country}`
      : 'Country';

  return (
    <details style={{position: 'relative', cursor: 'pointer'}}>
      <summary>{label}</summary>
      <div
        style={{
          position: 'absolute',
          background: 'white',
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 4,
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <LocaleForm
            key={`locale-${locale.language}-${locale.country}`}
            locale={locale}
          />
        ))}
      </div>
    </details>
  );
}

function LocaleForm({locale}: {locale: Locale}) {
  const {pathname, search} = useLocation();
  const selectedLocale = useSelectedLocale();

  // Get the new path with the new locale, preserving the current path
  const pathWithoutLocale = getPathWithoutLocale(pathname, selectedLocale);
  const newPath = `${locale.pathPrefix.replace(/\/+$/, '')}${pathWithoutLocale}${search}`;

  const action = `${locale.pathPrefix.replace(/\/+$/, '')}/cart`;
  const variables = {
    action: CartForm.ACTIONS.BuyerIdentityUpdate,
    inputs: {
      buyerIdentity: {
        countryCode: locale.country.toUpperCase(),
      },
    },
  };

  return (
    <Form method="POST" action={action}>
      <input type="hidden" name="redirectTo" value={newPath} />
      <input
        type="hidden"
        name="cartFormInput"
        value={JSON.stringify(variables)}
      />
      <button type="submit">
        {locale.language}-{locale.country}
      </button>
    </Form>
  );
}

~~~

</details>

#### Step 1.3: Create a unified locale-aware Link component

Create a single Link component that handles both regular links and navigation links.
This component automatically:
- Prepends the current locale to paths
- Supports variant="nav" for navigation links with active states
- Cleans invalid locale prefixes from menu URLs
- Enables locale switching while preserving paths

##### File: [Link.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/Link.tsx)

<details>

~~~tsx
import type {LinkProps, NavLinkProps} from 'react-router';
import {Link as ReactLink, NavLink as ReactNavLink} from 'react-router';
import {useLocalizedPath, cleanPath} from '../lib/i18n';
import type {Locale} from '../lib/i18n';

type BaseProps = {
  locale?: Locale;
  preservePath?: boolean;
};

type LinkVariantProps = BaseProps & LinkProps & {
  variant?: never;
};

type NavLinkVariantProps = BaseProps & NavLinkProps & {
  variant: 'nav';
};

export type ExtendedLinkProps = LinkVariantProps | NavLinkVariantProps;

/**
 * Locale-aware Link component that handles both regular and navigation links
 * 
 * @example
 * // Regular link (auto-adds current locale)
 * <Link to="/products">Products</Link>
 * 
 * @example
 * // Navigation link with active styles
 * <Link variant="nav" to="/about" style={activeStyle}>About</Link>
 * 
 * @example
 * // Switch locale while preserving current path
 * <Link to="/" locale={frenchLocale} preservePath>Français</Link>
 * 
 * @example
 * // Link to specific locale
 * <Link to="/products" locale={canadianLocale}>Canadian Products</Link>
 */
export function Link(props: ExtendedLinkProps) {
  const {locale, preservePath = false, variant, ...restProps} = props;
  let to = restProps.to;
  
  // Auto-clean menu URLs for navigation links
  if (variant === 'nav' && typeof to === 'string') {
    if (to.includes('://')) {
      try {
        to = new URL(to).pathname;
      } catch {
        // Keep original URL
      }
    }
    to = cleanPath(to);
  }
  
  to = useLocalizedPath(to, locale, preservePath);
  
  if (variant === 'nav') {
    return <ReactNavLink {...(restProps as NavLinkProps)} to={to} />;
  }
  return <ReactLink {...(restProps as LinkProps)} to={to} />;
}
~~~

</details>

#### Step 1.4: Create comprehensive i18n utilities

Create a centralized i18n module that includes:
1. The `useSelectedLocale()` hook to get the current locale from route data
2. The `useLocalizedPath()` hook for intelligent path transformation
3. The `cleanPath()` function to remove invalid locale/language prefixes
4. The `findLocaleByPrefix()` function to detect locales in paths
5. The `normalizePrefix()` function for consistent prefix formatting
6. Locale validation utilities for route params
7. Support for case-insensitive locale matching

##### File: [i18n.ts](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/lib/i18n.ts)

<details>

~~~ts
import {useMatches, useLocation} from 'react-router';
import type {
  CountryCode as CustomerCountryCode,
  LanguageCode as CustomerLanguageCode,
} from '@shopify/hydrogen/customer-account-api-types';
import type {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

type LanguageCode = CustomerLanguageCode & StorefrontLanguageCode;
type CountryCode = CustomerCountryCode & StorefrontCountryCode;

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  pathPrefix: string;
};

export const DEFAULT_LOCALE: Locale = {
  language: 'EN',
  country: 'US',
  pathPrefix: '/',
};

export const SUPPORTED_LOCALES: Locale[] = [
  DEFAULT_LOCALE,
  {language: 'EN', country: 'CA', pathPrefix: '/EN-CA'},
  {language: 'FR', country: 'CA', pathPrefix: '/FR-CA'},
  {language: 'FR', country: 'FR', pathPrefix: '/FR-FR'},
];

const RE_LOCALE_PREFIX = /^[A-Z]{2}-[A-Z]{2}$/i;

function getFirstPathPart(url: URL): string | null {
  return (
    url.pathname
      // take the first part of the pathname (split by /)
      .split('/')
      .at(1)
      // replace the .data suffix, if present
      ?.replace(/\.data$/, '')
      // normalize to uppercase
      ?.toUpperCase() ?? null
  );
}

export function getLocaleFromRequest(request: Request): Locale {
  const firstPathPart = getFirstPathPart(new URL(request.url));

  type LocaleFromUrl = [Locale['language'], Locale['country']];

  let pathPrefix = '';

  // If the first path part is not a valid locale, return the default locale
  if (firstPathPart == null || !RE_LOCALE_PREFIX.test(firstPathPart)) {
    return DEFAULT_LOCALE;
  }

  pathPrefix = '/' + firstPathPart;
  const [language, country] = firstPathPart.split('-') as LocaleFromUrl;
  return {language, country, pathPrefix};
}

export interface WithLocale {
  selectedLocale: Locale;
}

/**
 * Get the currently selected locale from route data
 * @returns Current locale or null if not set
 * 
 * @example
 * const locale = useSelectedLocale();
 * // {language: 'FR', country: 'CA', pathPrefix: '/FR-CA'}
 */
export function useSelectedLocale(): Locale | null {
  const [root] = useMatches();
  const {selectedLocale} = root.data as WithLocale;

  return selectedLocale ?? null;
}

/**
 * Get pathname without locale prefix (case-insensitive)
 */
export function getPathWithoutLocale(pathname: string, selectedLocale: Locale | null): string {
  if (!selectedLocale?.pathPrefix) return pathname;
  
  const prefix = selectedLocale.pathPrefix.replace(/\/+$/, '');
  // Case-insensitive check for locale prefix
  if (pathname.toLowerCase().startsWith(prefix.toLowerCase())) {
    const pathWithoutPrefix = pathname.slice(prefix.length);
    // Ensure it starts with /
    return pathWithoutPrefix.startsWith('/') ? pathWithoutPrefix : '/' + pathWithoutPrefix;
  }
  return pathname;
}

export function localeMatchesPrefix(localeSegment: string | null): boolean {
  const prefix = '/' + (localeSegment ?? '');
  return SUPPORTED_LOCALES.some((supportedLocale) => {
    return supportedLocale.pathPrefix.toUpperCase() === prefix.toUpperCase();
  });
}

/**
 * Normalize a locale prefix (remove trailing slashes)
 */
export function normalizePrefix(prefix: string): string {
  return prefix.replace(/\/+$/, '') || '';
}

/**
 * Find a locale by its prefix in a path
 */
export function findLocaleByPrefix(path: string): Locale | null {
  const normalizedPath = path.toLowerCase();
  return SUPPORTED_LOCALES.find(locale => {
    if (locale.pathPrefix === '/') return false;
    return normalizedPath.startsWith(locale.pathPrefix.toLowerCase());
  }) ?? null;
}

/**
 * Remove locale or language prefixes from a path
 * Examples: /fr/products → /products, /FR-CA/about → /about
 */
export function cleanPath(pathname: string): string {
  const locale = findLocaleByPrefix(pathname);
  if (locale) {
    const prefix = normalizePrefix(locale.pathPrefix);
    return pathname.slice(prefix.length) || '/';
  }
  
  // Remove language-only prefixes that aren't valid locales
  const match = pathname.match(/^\/[a-z]{2}(-[a-z]{2})?\//i);
  if (match && !findLocaleByPrefix(match[0])) {
    return pathname.slice(match[0].length - 1);
  }
  
  return pathname;
}

/**
 * Transform a path with appropriate locale prefix
 * 
 * @param to - Target path
 * @param locale - Optional specific locale to use
 * @param preservePath - Keep current path when switching locales
 * @returns Localized path
 * 
 * @example
 * // Add current locale to path
 * useLocalizedPath('/products') // '/FR-CA/products'
 * 
 * @example
 * // Switch to different locale
 * useLocalizedPath('/', frenchLocale, true) // '/FR-CA/current-path'
 * 
 * @example
 * // Force specific locale
 * useLocalizedPath('/about', englishLocale) // '/EN-CA/about'
 */
export function useLocalizedPath(
  to: string | object,
  locale?: Locale,
  preservePath = false
): string | object {
  const currentLocale = useSelectedLocale();
  const {pathname} = useLocation();
  
  if (typeof to !== 'string') return to;
  
  // Locale switching: maintain current path
  if (locale && preservePath) {
    const cleanCurrentPath = cleanPath(pathname);
    return normalizePrefix(locale.pathPrefix) + cleanCurrentPath;
  }
  
  // Explicit locale for specific link
  if (locale) {
    return normalizePrefix(locale.pathPrefix) + to;
  }
  
  // Skip if path already has locale
  if (findLocaleByPrefix(to)) {
    return to;
  }
  
  // Add current locale to path
  return normalizePrefix(currentLocale?.pathPrefix || '') + to;
}

~~~

</details>

#### Step 1.5: Update ProductItem to use locale-aware Link

Replace standard react-router Link imports with the new unified Link component.
This ensures all product links automatically include the correct locale prefix.

##### File: [app/components/ProductItem.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/components/ProductItem.tsx)

~~~diff
index 3b0f6913..81ff9ec9 100644
--- a/templates/skeleton/app/components/ProductItem.tsx
+++ b/templates/skeleton/app/components/ProductItem.tsx
@@ -1,4 +1,3 @@
-import {Link} from 'react-router';
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
~~~

#### Step 1.6: Add the selected locale to the context

Detect the locale from the URL path, and add it to the HydrogenContext.

##### File: [app/lib/context.ts](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/lib/context.ts)

~~~diff
index 692d5ae1..7373ebca 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,6 +1,7 @@
 import {createHydrogenContext} from '@shopify/hydrogen';
 import {AppSession} from '~/lib/session';
 import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
+import {getLocaleFromRequest} from './i18n';
 
 // Define the additional context object
 const additionalContext = {
@@ -40,6 +41,8 @@ export async function createHydrogenRouterContext(
     AppSession.init(request, [env.SESSION_SECRET]),
   ]);
 
+  const i18n = getLocaleFromRequest(request);
+
   const hydrogenContext = createHydrogenContext(
     {
       env,
@@ -47,8 +50,7 @@ export async function createHydrogenRouterContext(
       cache,
       waitUntil,
       session,
-      // Or detect from URL path based on locale subpath, cookies, or any other strategy
-      i18n: {language: 'EN', country: 'US'},
+      i18n,
       cart: {
         queryFragment: CART_QUERY_FRAGMENT,
       },
~~~

#### Step 1.7: Update Header with CountrySelector and locale-aware Links

1. Add the `CountrySelector` component to the header navigation.
2. Update all navigation links to use the unified `Link` component with `variant="nav"`.

Menu URLs are automatically cleaned of invalid locale prefixes.

##### File: [app/components/Header.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/components/Header.tsx)

<details>

~~~diff
index 45b620b4..00c29ecc 100644
--- a/templates/skeleton/app/components/Header.tsx
+++ b/templates/skeleton/app/components/Header.tsx
@@ -1,5 +1,6 @@
 import {Suspense} from 'react';
-import {Await, NavLink, useAsyncValue} from 'react-router';
+import {Await, useAsyncValue} from 'react-router';
+import {Link} from '~/components/Link';
 import {
   type CartViewPayload,
   useAnalytics,
@@ -7,6 +8,7 @@ import {
 } from '@shopify/hydrogen';
 import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
+import {CountrySelector} from './CountrySelector';
 
 interface HeaderProps {
   header: HeaderQuery;
@@ -26,9 +28,9 @@ export function Header({
   const {shop, menu} = header;
   return (
     <header className="header">
-      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
+      <Link variant="nav" prefetch="intent" to="/" style={activeLinkStyle} end>
         <strong>{shop.name}</strong>
-      </NavLink>
+      </Link>
       <HeaderMenu
         menu={menu}
         viewport="desktop"
@@ -57,7 +59,8 @@ export function HeaderMenu({
   return (
     <nav className={className} role="navigation">
       {viewport === 'mobile' && (
-        <NavLink
+        <Link
+          variant="nav"
           end
           onClick={close}
           prefetch="intent"
@@ -65,7 +68,7 @@ export function HeaderMenu({
           to="/"
         >
           Home
-        </NavLink>
+        </Link>
       )}
       {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
         if (!item.url) return null;
@@ -78,7 +81,8 @@ export function HeaderMenu({
             ? new URL(item.url).pathname
             : item.url;
         return (
-          <NavLink
+          <Link
+            variant="nav"
             className="header-menu-item"
             end
             key={item.id}
@@ -88,7 +92,7 @@ export function HeaderMenu({
             to={url}
           >
             {item.title}
-          </NavLink>
+          </Link>
         );
       })}
     </nav>
@@ -102,13 +106,14 @@ function HeaderCtas({
   return (
     <nav className="header-ctas" role="navigation">
       <HeaderMenuMobileToggle />
-      <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
+      <CountrySelector />
+      <Link variant="nav" prefetch="intent" to="/account" style={activeLinkStyle}>
         <Suspense fallback="Sign in">
           <Await resolve={isLoggedIn} errorElement="Sign in">
             {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
           </Await>
         </Suspense>
-      </NavLink>
+      </Link>
       <SearchToggle />
       <CartToggle cart={cart} />
     </nav>
~~~

</details>

#### Step 1.8: Add the selected locale to the root route

1. Include the selected locale in the root route's loader data.
2. Make sure to redirect to the 404 page if the requested locale is not supported.
3. Add a key prop to the `PageLayout` component to make sure it re-renders
when the locale changes.

##### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/root.tsx)

~~~diff
index df87425c..97ca8174 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -77,6 +77,7 @@ export async function loader(args: Route.LoaderArgs) {
   return {
     ...deferredData,
     ...criticalData,
+    selectedLocale: args.context.storefront.i18n,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
       storefront,
@@ -176,7 +177,10 @@ export default function App() {
       shop={data.shop}
       consent={data.consent}
     >
-      <PageLayout {...data}>
+      <PageLayout
+        key={`${data.selectedLocale.language}-${data.selectedLocale.country}`}
+        {...data}
+      >
         <Outlet />
       </PageLayout>
     </Analytics.Provider>
~~~

### Step 2: Localizing the individual routes

In this section, we'll add localization to the individual routes using the language [dynamic segment](https://reactrouter.com/start/data/routing#optional-segments).

#### Step 2.1: Update CartMain with locale-aware links

Replace all Link imports to use the unified locale-aware `Link` component for consistent navigation.

##### File: [app/components/CartMain.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/components/CartMain.tsx)

~~~diff
index 1117b68b..870f008a 100644
--- a/templates/skeleton/app/components/CartMain.tsx
+++ b/templates/skeleton/app/components/CartMain.tsx
@@ -1,5 +1,5 @@
 import {useOptimisticCart} from '@shopify/hydrogen';
-import {Link} from 'react-router';
+import {Link} from '~/components/Link';
 import type {CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
 import {CartLineItem} from '~/components/CartLineItem';
~~~

#### Step 2.2: Add language dynamic segment to the desired routes

To implement path-based localization, add a language
dynamic segment to your localized routes (for example, renaming `routes/_index.tsx`
to `routes/($locale)._index.tsx`).

For brevity, we'll focus on the home page, the cart page, and the product page in this example. In your app, you should do this for all the app routes.

#### Step 2.3: Add localization to the home page

1. Add the dynamic segment to the home page route.
2. Use the new `Link` component as a drop-in replacement.

> [!NOTE]
> Rename `app/routes/_index.tsx` to `app/routes/($locale)._index.tsx`.

##### File: [($locale)._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale)._index.tsx)

<details>

~~~tsx
import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {Link} from '../components/Link';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    featuredCollection: collections.nodes[0],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: unknown) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      <FeaturedCollection collection={data.featuredCollection} />
      <RecommendedProducts products={data.recommendedProducts} />
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </div>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.4: Add localization to the cart page

Add the dynamic segment to the cart page route.

> [!NOTE]
> Rename `app/routes/cart.tsx` to `app/routes/($locale).cart.tsx`.

##### File: [($locale).cart.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).cart.tsx)

<details>

~~~tsx
import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/($locale).cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: Route.HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}

~~~

</details>

#### Step 2.5: Add localization to the product page

1. Add the dynamic segment to the product page route.
2. Update the `meta` function to also update the canonical URL to use the
localized prefix.

> [!NOTE]
> Rename `app/routes/products.$handle.tsx` to `app/routes/($locale).products.$handle.tsx`.

##### File: [($locale).products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).products.$handle.tsx)

<details>

~~~tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import type {WithLocale} from '~/lib/i18n';
import {DEFAULT_LOCALE} from '~/lib/i18n';

export const meta: Route.MetaFunction = (args) => {
  const rootMatch = args.matches.at(0) ?? null;
  const selectedLocale =
    (rootMatch?.data as WithLocale)?.selectedLocale ?? null;

  const prefix = (
    selectedLocale?.pathPrefix ?? DEFAULT_LOCALE.pathPrefix
  ).replace(/\/+$/, '');
  const href = `${prefix}/products/${args.data?.product.handle}`;

  return [
    {title: `Hydrogen | ${args.data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  params,
  request,
}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions: getSelectedProductOptions(request),
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

~~~

</details>

#### Step 2.6: Add a utility route to validate the locale.

Add a utility route in `$(locale).tsx` that will use `localeMatchesPrefix`
to validate the locale from the URL params. If the locale is invalid,
the route will throw a 404 error.

##### File: [($locale).tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).tsx)

<details>

~~~tsx
import type {Route} from './+types/($locale)';
import {localeMatchesPrefix} from '~/lib/i18n';

export async function loader({params}: Route.LoaderArgs) {
  if (!localeMatchesPrefix(params.locale ?? null)) {
    throw new Response('Invalid locale', {status: 404});
  }

  return null;
}

~~~

</details>

#### Step 2.7: app/routes/($locale).account.$.tsx

Add a fallback route for unauthenticated account pages with locale support.

##### File: [($locale).account.$.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.$.tsx)

<details>

~~~tsx
import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account.$';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  return redirect('/account');
}

~~~

</details>

#### Step 2.8: app/routes/($locale).account._index.tsx

Add a localized account dashboard redirect route.

##### File: [($locale).account._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account._index.tsx)

<details>

~~~tsx
import {redirect} from 'react-router';

export async function loader() {
  return redirect('/account/orders');
}

~~~

</details>

#### Step 2.9: app/routes/($locale).account.addresses.tsx

Add a customer address management page with locale-aware forms and links.

##### File: [($locale).account.addresses.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.addresses.tsx)

<details>

~~~tsx
import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from 'react-router';
import type {Route} from './+types/($locale).account.addresses';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Addresses'}];
};

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: context.customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: context.customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: context.customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;

  return (
    <div className="account-addresses">
      <h2>Addresses</h2>
      <br />
      {!addresses.nodes.length ? (
        <p>You have no addresses saved.</p>
      ) : (
        <div>
          <div>
            <legend>Create address</legend>
            <NewAddressForm />
          </div>
          <br />
          <hr />
          <br />
          <ExistingAddresses
            addresses={addresses}
            defaultAddress={defaultAddress}
          />
        </div>
      )}
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  } as CustomerAddressInput;

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <div>
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
          >
            {stateForMethod('POST') !== 'idle' ? 'Creating' : 'Create'}
          </button>
        </div>
      )}
    </AddressForm>
  );
}

function ExistingAddresses({
  addresses,
  defaultAddress,
}: Pick<CustomerFragment, 'addresses' | 'defaultAddress'>) {
  return (
    <div>
      <legend>Existing addresses</legend>
      {addresses.nodes.map((address) => (
        <AddressForm
          key={address.id}
          addressId={address.id}
          address={address}
          defaultAddress={defaultAddress}
        >
          {({stateForMethod}) => (
            <div>
              <button
                disabled={stateForMethod('PUT') !== 'idle'}
                formMethod="PUT"
                type="submit"
              >
                {stateForMethod('PUT') !== 'idle' ? 'Saving' : 'Save'}
              </button>
              <button
                disabled={stateForMethod('DELETE') !== 'idle'}
                formMethod="DELETE"
                type="submit"
              >
                {stateForMethod('DELETE') !== 'idle' ? 'Deleting' : 'Delete'}
              </button>
            </div>
          )}
        </AddressForm>
      ))}
    </div>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment['id'];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment['defaultAddress'];
  children: (props: {
    stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
  }) => React.ReactNode;
}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  return (
    <Form id={addressId}>
      <fieldset>
        <input type="hidden" name="addressId" defaultValue={addressId} />
        <label htmlFor="firstName">First name*</label>
        <input
          aria-label="First name"
          autoComplete="given-name"
          defaultValue={address?.firstName ?? ''}
          id="firstName"
          name="firstName"
          placeholder="First name"
          required
          type="text"
        />
        <label htmlFor="lastName">Last name*</label>
        <input
          aria-label="Last name"
          autoComplete="family-name"
          defaultValue={address?.lastName ?? ''}
          id="lastName"
          name="lastName"
          placeholder="Last name"
          required
          type="text"
        />
        <label htmlFor="company">Company</label>
        <input
          aria-label="Company"
          autoComplete="organization"
          defaultValue={address?.company ?? ''}
          id="company"
          name="company"
          placeholder="Company"
          type="text"
        />
        <label htmlFor="address1">Address line*</label>
        <input
          aria-label="Address line 1"
          autoComplete="address-line1"
          defaultValue={address?.address1 ?? ''}
          id="address1"
          name="address1"
          placeholder="Address line 1*"
          required
          type="text"
        />
        <label htmlFor="address2">Address line 2</label>
        <input
          aria-label="Address line 2"
          autoComplete="address-line2"
          defaultValue={address?.address2 ?? ''}
          id="address2"
          name="address2"
          placeholder="Address line 2"
          type="text"
        />
        <label htmlFor="city">City*</label>
        <input
          aria-label="City"
          autoComplete="address-level2"
          defaultValue={address?.city ?? ''}
          id="city"
          name="city"
          placeholder="City"
          required
          type="text"
        />
        <label htmlFor="zoneCode">State / Province*</label>
        <input
          aria-label="State/Province"
          autoComplete="address-level1"
          defaultValue={address?.zoneCode ?? ''}
          id="zoneCode"
          name="zoneCode"
          placeholder="State / Province"
          required
          type="text"
        />
        <label htmlFor="zip">Zip / Postal Code*</label>
        <input
          aria-label="Zip"
          autoComplete="postal-code"
          defaultValue={address?.zip ?? ''}
          id="zip"
          name="zip"
          placeholder="Zip / Postal Code"
          required
          type="text"
        />
        <label htmlFor="territoryCode">Country Code*</label>
        <input
          aria-label="territoryCode"
          autoComplete="country"
          defaultValue={address?.territoryCode ?? ''}
          id="territoryCode"
          name="territoryCode"
          placeholder="Country"
          required
          type="text"
          maxLength={2}
        />
        <label htmlFor="phoneNumber">Phone</label>
        <input
          aria-label="Phone Number"
          autoComplete="tel"
          defaultValue={address?.phoneNumber ?? ''}
          id="phoneNumber"
          name="phoneNumber"
          placeholder="+16135551111"
          pattern="^\+?[1-9]\d{3,14}$"
          type="tel"
        />
        <div>
          <input
            defaultChecked={isDefaultAddress}
            id="defaultAddress"
            name="defaultAddress"
            type="checkbox"
          />
          <label htmlFor="defaultAddress">Set as default address</label>
        </div>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        {children({
          stateForMethod: (method) => (formMethod === method ? state : 'idle'),
        })}
      </fieldset>
    </Form>
  );
}

~~~

</details>

#### Step 2.1: app/routes/($locale).account.orders.$id.tsx

Add an individual order details page with localized currency and date formatting.

##### File: [($locale).account.orders.$id.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.orders.$id.tsx)

<details>

~~~tsx
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Order ${data?.order?.name}`}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await context.customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: context.customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  };
}

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  } = useLoaderData<typeof loader>();
  return (
    <div className="account-order">
      <h2>Order {order.name}</h2>
      <p>Placed on {new Date(order.processedAt!).toDateString()}</p>
      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map(
              (lineItem: OrderLineItemFullFragment, lineItemIndex: number) => (
                // eslint-disable-next-line react/no-array-index-key
                <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
              ),
            )}
          </tbody>
          <tfoot>
            {((discountValue && discountValue.amount) ||
              discountPercentage) && (
              <tr>
                <th scope="row" colSpan={3}>
                  <p>Discounts</p>
                </th>
                <th scope="row">
                  <p>Discounts</p>
                </th>
                <td>
                  {discountPercentage ? (
                    <span>-{discountPercentage}% OFF</span>
                  ) : (
                    discountValue && <Money data={discountValue!} />
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3}>
                <p>Subtotal</p>
              </th>
              <th scope="row">
                <p>Subtotal</p>
              </th>
              <td>
                <Money data={order.subtotal!} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Tax
              </th>
              <th scope="row">
                <p>Tax</p>
              </th>
              <td>
                <Money data={order.totalTax!} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <th scope="row">
                <p>Total</p>
              </th>
              <td>
                <Money data={order.totalPrice!} />
              </td>
            </tr>
          </tfoot>
        </table>
        <div>
          <h3>Shipping Address</h3>
          {order?.shippingAddress ? (
            <address>
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.formatted ? (
                <p>{order.shippingAddress.formatted}</p>
              ) : (
                ''
              )}
              {order.shippingAddress.formattedArea ? (
                <p>{order.shippingAddress.formattedArea}</p>
              ) : (
                ''
              )}
            </address>
          ) : (
            <p>No shipping address defined</p>
          )}
          <h3>Status</h3>
          <div>
            <p>{fulfillmentStatus}</p>
          </div>
        </div>
      </div>
      <br />
      <p>
        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
          View Order Status →
        </a>
      </p>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>
        <Money data={lineItem.price!} />
      </td>
      <td>{lineItem.quantity}</td>
      <td>
        <Money data={lineItem.totalDiscount!} />
      </td>
    </tr>
  );
}

~~~

</details>

#### Step 2.11: app/routes/($locale).account.orders._index.tsx

Implement customer order history listing with locale-specific pagination.

##### File: [($locale).account.orders._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.orders._index.tsx)

<details>

~~~tsx
import {
  useLoaderData,
} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).account.orders._index';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_ORDERS_QUERY,
    {
      variables: {
        ...paginationVariables,
        language: context.customerAccount.i18n.language,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer};
}

export default function Orders() {
  const {customer} = useLoaderData<{customer: CustomerOrdersFragment}>();
  const {orders} = customer;
  return (
    <div className="orders">
      {orders.nodes.length ? <OrdersTable orders={orders} /> : <EmptyOrders />}
    </div>
  );
}

function OrdersTable({orders}: Pick<CustomerOrdersFragment, 'orders'>) {
  return (
    <div className="acccount-orders">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders}>
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders />
      )}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div>
      <p>You haven&apos;t placed any orders yet.</p>
      <br />
      <p>
        <Link to="/collections">Start Shopping →</Link>
      </p>
    </div>
  );
}

function OrderItem({order}: {order: OrderItemFragment}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  return (
    <>
      <fieldset>
        <Link to={`/account/orders/${btoa(order.id)}`}>
          <strong>#{order.number}</strong>
        </Link>
        <p>{new Date(order.processedAt).toDateString()}</p>
        <p>{order.financialStatus}</p>
        {fulfillmentStatus && <p>{fulfillmentStatus}</p>}
        <Money data={order.totalPrice} />
        <Link to={`/account/orders/${btoa(order.id)}`}>View Order →</Link>
      </fieldset>
      <br />
    </>
  );
}

~~~

</details>

#### Step 2.12: app/routes/($locale).account.profile.tsx

Add a customer profile editing form with localized field labels.

##### File: [($locale).account.profile.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.profile.tsx)

<details>

~~~tsx
import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/($locale).account.profile';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Profile'}];
};

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: context.customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;

  return (
    <div className="account-profile">
      <h2>My profile</h2>
      <br />
      <Form method="PUT">
        <legend>Personal information</legend>
        <fieldset>
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            aria-label="First name"
            defaultValue={customer.firstName ?? ''}
            minLength={2}
          />
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Last name"
            aria-label="Last name"
            defaultValue={customer.lastName ?? ''}
            minLength={2}
          />
        </fieldset>
        {action?.error ? (
          <p>
            <mark>
              <small>{action.error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button type="submit" disabled={state !== 'idle'}>
          {state !== 'idle' ? 'Updating' : 'Update'}
        </button>
      </Form>
    </div>
  );
}

~~~

</details>

#### Step 2.13: app/routes/($locale).account.tsx

Add an account layout wrapper with locale-aware navigation tabs.

##### File: [($locale).account.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account.tsx)

<details>

~~~tsx
import {
  data as remixData,
  Form,
  Outlet,
  useLoaderData,
} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_DETAILS_QUERY,
    {
      variables: {
        language: context.customerAccount.i18n.language,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}`
      : `Welcome to your account.`
    : 'Account Details';

  return (
    <div className="account">
      <h1>{heading}</h1>
      <br />
      <AccountMenu />
      <br />
      <br />
      <Outlet context={{customer}} />
    </div>
  );
}

function AccountMenu() {
  function isActiveStyle({
    isActive,
    isPending,
  }: {
    isActive: boolean;
    isPending: boolean;
  }) {
    return {
      fontWeight: isActive ? 'bold' : undefined,
      color: isPending ? 'grey' : 'black',
    };
  }

  return (
    <nav role="navigation">
      <Link variant="nav" to="/account/orders" style={isActiveStyle}>
        Orders &nbsp;
      </Link>
      &nbsp;|&nbsp;
      <Link variant="nav" to="/account/profile" style={isActiveStyle}>
        &nbsp; Profile &nbsp;
      </Link>
      &nbsp;|&nbsp;
      <Link variant="nav" to="/account/addresses" style={isActiveStyle}>
        &nbsp; Addresses &nbsp;
      </Link>
      &nbsp;|&nbsp;
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      &nbsp;<button type="submit">Sign out</button>
    </Form>
  );
}

~~~

</details>

#### Step 2.14: app/routes/($locale).account_.authorize.tsx

Add an OAuth authorization callback route with locale preservation.

##### File: [($locale).account_.authorize.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.authorize.tsx)

<details>

~~~tsx
import type {Route} from './+types/($locale).account_.authorize';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.authorize();
}

~~~

</details>

#### Step 2.15: app/routes/($locale).account_.login.tsx

Add a customer login redirect with a locale-specific return URL.

##### File: [($locale).account_.login.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.login.tsx)

<details>

~~~tsx
import type {Route} from './+types/($locale).account_.login';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.login();
}

~~~

</details>

#### Step 2.16: app/routes/($locale).account_.logout.tsx

Add a logout handler that maintains locale after the user signs out.

##### File: [($locale).account_.logout.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).account_.logout.tsx)

<details>

~~~tsx
import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account_.logout';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return context.customerAccount.logout();
}

~~~

</details>

#### Step 2.17: app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx

Add a blog article page with locale-specific content and SEO metadata.

##### File: [($locale).blogs.$blogHandle.$articleHandle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx)

<details>

~~~tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  return {article};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const {article} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <div className="article">
      <h1>
        {title}
        <div>
          <time dateTime={article.publishedAt}>{publishedDate}</time> &middot;{' '}
          <address>{author?.name}</address>
        </div>
      </h1>

      {image && <Image data={image} sizes="90vw" loading="eager" />}
      <div
        dangerouslySetInnerHTML={{__html: contentHtml}}
        className="article"
      />
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.18: app/routes/($locale).blogs.$blogHandle._index.tsx

Add a blog listing page with localized article previews and pagination.

##### File: [($locale).blogs.$blogHandle._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs.$blogHandle._index.tsx)

<details>

~~~tsx
import {
  useLoaderData,
} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).blogs.$blogHandle._index';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.blog.title ?? ''} blog`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  request,
  params,
}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  if (!params.blogHandle) {
    throw new Response(`blog not found`, {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.blogHandle, data: blog});

  return {blog};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blog() {
  const {blog} = useLoaderData<typeof loader>();
  const {articles} = blog;

  return (
    <div className="blog">
      <h1>{blog.title}</h1>
      <div className="blog-grid">
        <PaginatedResourceSection<ArticleItemFragment> connection={articles}>
          {({node: article, index}) => (
            <ArticleItem
              article={article}
              key={article.id}
              loading={index < 2 ? 'eager' : 'lazy'}
            />
          )}
        </PaginatedResourceSection>
      </div>
    </div>
  );
}

function ArticleItem({
  article,
  loading,
}: {
  article: ArticleItemFragment;
  loading?: HTMLImageElement['loading'];
}) {
  const publishedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt!));
  return (
    <div className="blog-article" key={article.id}>
      <Link to={`/blogs/${article.blog.handle}/${article.handle}`}>
        {article.image && (
          <div className="blog-article-image">
            <Image
              alt={article.image.altText || article.title}
              aspectRatio="3/2"
              data={article.image}
              loading={loading}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        )}
        <h3>{article.title}</h3>
        <small>{publishedAt}</small>
      </Link>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          hasNextPage
          endCursor
          startCursor
        }

      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
` as const;

~~~

</details>

#### Step 2.19: app/routes/($locale).blogs._index.tsx

Add an overview page for all blogs with locale-aware navigation links.

##### File: [($locale).blogs._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).blogs._index.tsx)

<details>

~~~tsx
import {useLoaderData} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).blogs._index';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import type {BlogsQuery} from 'storefrontapi.generated';

type BlogNode = BlogsQuery['blogs']['nodes'][0];

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Blogs`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 10,
  });

  const [{blogs}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {blogs};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blogs() {
  const {blogs} = useLoaderData<typeof loader>();

  return (
    <div className="blogs">
      <h1>Blogs</h1>
      <div className="blogs-grid">
        <PaginatedResourceSection<BlogNode> connection={blogs}>
          {({node: blog}) => (
            <Link
              className="blog"
              key={blog.handle}
              prefetch="intent"
              to={`/blogs/${blog.handle}`}
            >
              <h2>{blog.title}</h2>
            </Link>
          )}
        </PaginatedResourceSection>
      </div>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.2: app/routes/($locale).collections.$handle.tsx

Add a collection page displaying products with locale-specific pricing and availability.

##### File: [($locale).collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections.$handle.tsx)

<details>

~~~tsx
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import type {ProductItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.collection.title ?? ''} Collection`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  if (!handle) {
    throw redirect('/collections');
  }

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, ...paginationVariables},
      // Add other queries here, so that they are loaded in parallel
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {
    collection,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <p className="collection-description">{collection.description}</p>
      <PaginatedResourceSection<ProductItemFragment>
        connection={collection.products}
        resourcesClassName="products-grid"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.21: app/routes/($locale).collections._index.tsx

Add a collections listing page with localized collection names and images.

##### File: [($locale).collections._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections._index.tsx)

<details>

~~~tsx
import {useLoaderData} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY, {
      variables: paginationVariables,
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {collections};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div className="collections">
      <h1>Collections</h1>
      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        resourcesClassName="collections-grid"
      >
        {({node: collection, index}) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            index={index}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <Link
      className="collection-item"
      key={collection.id}
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      {collection?.image && (
        <Image
          alt={collection.image.altText || collection.title}
          aspectRatio="1/1"
          data={collection.image}
          loading={index < 3 ? 'eager' : undefined}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h5>{collection.title}</h5>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.22: app/routes/($locale).collections.all.tsx

Add an "All products" page with locale-based filtering and sorting.

##### File: [($locale).collections.all.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).collections.all.tsx)

<details>

~~~tsx
import type {Route} from './+types/($locale).collections.all';
import {
  useLoaderData,
} from 'react-router';
import {getPaginationVariables, Image, Money} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import type {CollectionItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Products`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {...paginationVariables},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {products};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1>Products</h1>
      <PaginatedResourceSection<CollectionItemFragment>
        connection={products}
        resourcesClassName="products-grid"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...CollectionItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_ITEM_FRAGMENT}
` as const;

~~~

</details>

#### Step 2.23: app/routes/($locale).pages.$handle.tsx

Add a dynamic page route for locale-specific content pages.

##### File: [($locale).pages.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).pages.$handle.tsx)

<details>

~~~tsx
import {
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/($locale).pages.$handle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.page.title ?? ''}`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  request,
  params,
}: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const [{page}] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {
    page,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();

  return (
    <div className="page">
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={{__html: page.body}} />
    </div>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.24: app/routes/($locale).policies.$handle.tsx

Add a policy page (privacy, terms, etc.) with locale-specific legal content.

##### File: [($locale).policies.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).policies.$handle.tsx)

<details>

~~~tsx
import {
  useLoaderData,
} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).policies.$handle';
import {type Shop} from '@shopify/hydrogen/storefront-api-types';

type SelectedPolicies = keyof Pick<
  Shop,
  'privacyPolicy' | 'shippingPolicy' | 'termsOfService' | 'refundPolicy'
>;

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.policy.title ?? ''}`}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = params.handle.replace(
    /-([a-z])/g,
    (_: unknown, m1: string) => m1.toUpperCase(),
  ) as SelectedPolicies;

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response('Could not find the policy', {status: 404});
  }

  return {policy};
}

export default function Policy() {
  const {policy} = useLoaderData<typeof loader>();

  return (
    <div className="policy">
      <br />
      <br />
      <div>
        <Link to="/policies">← Back to Policies</Link>
      </div>
      <br />
      <h1>{policy.title}</h1>
      <div dangerouslySetInnerHTML={{__html: policy.body}} />
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.25: app/routes/($locale).policies._index.tsx

Add a policies index page that lists all available store policies.

##### File: [($locale).policies._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).policies._index.tsx)

<details>

~~~tsx
import {useLoaderData} from 'react-router';
import {Link} from '~/components/Link';
import type {Route} from './+types/($locale).policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);
  
  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="policies">
      <h1>Policies</h1>
      <div>
        {policies.map((policy) => (
          <fieldset key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;

~~~

</details>

#### Step 2.26: app/routes/($locale).search.tsx

Add a search results page with locale-aware product matching and predictive search.

##### File: [($locale).search.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).search.tsx)

<details>

~~~tsx
import {
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/($locale).search';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {SearchForm} from '~/components/SearchForm';
import {SearchResults} from '~/components/SearchResults';
import {
  type RegularSearchReturn,
  type PredictiveSearchReturn,
  getEmptyPredictiveSearchResult,
} from '~/lib/search';
import type {RegularSearchQuery, PredictiveSearchQuery} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Search`}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');
  const searchPromise: Promise<PredictiveSearchReturn | RegularSearchReturn> =
    isPredictive
      ? predictiveSearch({request, context})
      : regularSearch({request, context});

  searchPromise.catch((error: Error) => {
    console.error(error);
    return {term: '', result: null, error: error.message};
  });

  return await searchPromise;
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const {type, term, result, error} = useLoaderData<typeof loader>();
  if (type === 'predictive') return null;

  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm>
        {({inputRef}) => (
          <>
            <input
              defaultValue={term}
              name="q"
              placeholder="Search…"
              ref={inputRef}
              type="search"
            />
            &nbsp;
            <button type="submit">Search</button>
          </>
        )}
      </SearchForm>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {!term || !result?.total ? (
        <SearchResults.Empty />
      ) : (
        <SearchResults result={result} term={term}>
          {({articles, pages, products, term}) => (
            <div>
              <SearchResults.Products products={products} term={term} />
              <SearchResults.Pages pages={pages} term={term} />
              <SearchResults.Articles articles={articles} term={term} />
            </div>
          )}
        </SearchResults>
      )}
      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const;

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
}: Pick<
  Route.LoaderArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const term = String(url.searchParams.get('q') || '');

  // Search articles, pages, and products for the `q` term
  const {errors, ...items}: {errors?: Array<{message: string}>} & RegularSearchQuery = await storefront.query(SEARCH_QUERY, {
    variables: {...variables, term},
  });

  if (!items) {
    throw new Error('No search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, {nodes}: {nodes: Array<unknown>}) => acc + nodes.length,
    0,
  );

  const error = errors
    ? errors.map(({message}: {message: string}) => message).join(', ')
    : undefined;

  return {type: 'regular', term, error, result: {total, items}};
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {predictiveSearch: items, errors}: PredictiveSearchQuery & {errors?: Array<{message: string}>} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    },
  );

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}

~~~

</details>

## Deleted Files

- [templates/skeleton/app/routes/account.$.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.$.tsx)
- [templates/skeleton/app/routes/account._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account._index.tsx)
- [templates/skeleton/app/routes/account.addresses.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.addresses.tsx)
- [templates/skeleton/app/routes/account.orders.$id.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.orders.$id.tsx)
- [templates/skeleton/app/routes/account.orders._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.orders._index.tsx)
- [templates/skeleton/app/routes/account.profile.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.profile.tsx)
- [templates/skeleton/app/routes/account.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account.tsx)
- [templates/skeleton/app/routes/account_.authorize.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account_.authorize.tsx)
- [templates/skeleton/app/routes/account_.login.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account_.login.tsx)
- [templates/skeleton/app/routes/account_.logout.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/account_.logout.tsx)
- [templates/skeleton/app/routes/blogs.$blogHandle.$articleHandle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/blogs.$blogHandle.$articleHandle.tsx)
- [templates/skeleton/app/routes/blogs.$blogHandle._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/blogs.$blogHandle._index.tsx)
- [templates/skeleton/app/routes/blogs._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/blogs._index.tsx)
- [templates/skeleton/app/routes/collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/collections.$handle.tsx)
- [templates/skeleton/app/routes/collections._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/collections._index.tsx)
- [templates/skeleton/app/routes/collections.all.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/collections.all.tsx)
- [templates/skeleton/app/routes/pages.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/pages.$handle.tsx)
- [templates/skeleton/app/routes/policies.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/policies.$handle.tsx)
- [templates/skeleton/app/routes/policies._index.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/policies._index.tsx)
- [templates/skeleton/app/routes/search.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/templates/skeleton/app/routes/search.tsx)

## Next steps

- Test your implementation by going to your store and selecting a different
market from the country selector.
- Refer to the [Shopify
Help Center](https://help.shopify.com/en/manual/markets) for
more information on how to optimize and manage your international markets.