# Overview

This prompt describes how to implement "Markets" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

This recipe adds basic localization support to your Hydrogen app using Shopify Markets.

# User Intent Recognition

<user_queries>
- How do I add localization support to my Hydrogen app?
- How do I add a country selector to my Hydrogen app?
- Set up Shopify Markets in Hydrogen
- Help me segment my customers based on their location
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: I'm not seeing the localized content on my storefront.
  **Solution**: In your Shopify admin, make sure you've set up your store's regions and langauges using Shopify Markets, then check that your products are appropriately configured for each market. In your Hydrogen app, make sure you've added the dynamic segment to the desired routes and that the routes are correctly named.
- **Issue**: Some pages are showing localized content, but others aren't.
  **Solution**: Make sure you update *all* routes that need localization (not only the routes for the home page, the cart page, and the product page). See step 2.1 for details.
</troubleshooting>

# Recipe Implementation

Here's the markets recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

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

## Notes

> [!NOTE]
> This recipe is particularly useful for existing Hydrogen projects. If you need to set up a brand new Hydrogen app, you can get a solid foundation by selecting the localization options when setting up your new project using the Shopify CLI. You can also use `h2 setup markets` to add localization support to your new Hydrogen app.

## Requirements

- Set up your store's regions and languages using [Shopify
Markets](https://help.shopify.com/en/manual/markets).
- Configure your products appropriately for each market.
- Make sure your Hydrogen app is configured to use a default `language` and
`country code`. They will be used as the fallback when no market is explicitly
selected.

## New files added to the template by this recipe

- app/components/CountrySelector.tsx
- app/components/Link.tsx
- app/lib/i18n.ts
- app/routes/($locale)._index.tsx
- app/routes/($locale).cart.tsx
- app/routes/($locale).products.$handle.tsx
- app/routes/($locale).tsx

## Steps

### Step 1: Add localization utilities and update core components

In this section, we'll create utilities to handle localization and country selection, and update the core components to use these utilities.

#### Step 1.1: Create a CountrySelector component

Create a new `CountrySelector` component that allows users to select the locale from a dropdown of the supported locales.

To handle redirects, use a `Form` that updates the cart buyer identity,
which eventually redirects to the localized root of the app.

##### File: [CountrySelector.tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/CountrySelector.tsx)

```tsx
import {Form} from 'react-router';
import {Locale, SUPPORTED_LOCALES, useSelectedLocale} from '../lib/i18n';
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
          <LocaleLink
            key={`locale-${locale.language}-${locale.country}`}
            locale={locale}
          />
        ))}
      </div>
    </details>
  );
}

const LocaleLink = ({locale}: {locale: Locale}) => {
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
      <input type="hidden" name="redirectTo" value={locale.pathPrefix} />
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
};

```

#### Step 1.2: Create a Link wrapper component

Create a wrapper component around the `Link` component that prepends the selected locale path prefix (if any) to the actual links.

##### File: [Link.tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/components/Link.tsx)

```tsx
import {LinkProps, Link as ReactLink} from 'react-router';
import {useSelectedLocale} from '../lib/i18n';

export function Link({...props}: LinkProps) {
  const selectedLocale = useSelectedLocale();

  const prefix = selectedLocale?.pathPrefix.replace(/\/+$/, '') ?? '';
  const to = `${prefix}${props.to}`;

  return <ReactLink {...props} to={to} />;
}

```

#### Step 1.3: Create i18n helpers

1. Create a helper function to get locale information from the context, and
a hook to retrieve the selected locale.
2. Define a set of supported locales for the app.
3. Add a utility function to validate the locale from the route param against the supported locales.

##### File: [i18n.ts](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/lib/i18n.ts)

```ts
import {useMatches} from 'react-router';
import {
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen-react/storefront-api-types';

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

export function useSelectedLocale(): Locale | null {
  const [root] = useMatches();
  const {selectedLocale} = root.data as WithLocale;

  return selectedLocale ?? null;
}

export function localeMatchesPrefix(localeSegment: string | null): boolean {
  const prefix = '/' + (localeSegment ?? '');
  return SUPPORTED_LOCALES.some((supportedLocale) => {
    return supportedLocale.pathPrefix.toUpperCase() === prefix.toUpperCase();
  });
}

```

#### Step 1.4: Use the new Link component in the ProductItem component

Update the `ProductItem` component to use the `Link` component from the
`app/components/Link.tsx` file.

##### File: /app/components/ProductItem.tsx

```diff
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
```

#### Step 1.5: Add the selected locale to the context

Detect the locale from the URL path, and add it to the HydrogenContext.

##### File: /app/lib/context.ts

```diff
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

#### Step 1.6: Add the CountrySelector component to the Header

This adds a country selector component to the navigation.

##### File: /app/components/Header.tsx

```diff
@@ -7,6 +7,7 @@ import {
 } from '@shopify/hydrogen';
 import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
+import {CountrySelector} from './CountrySelector';
 
 interface HeaderProps {
   header: HeaderQuery;
@@ -102,6 +103,7 @@ function HeaderCtas({
   return (
     <nav className="header-ctas" role="navigation">
       <HeaderMenuMobileToggle />
+      <CountrySelector />
       <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
         <Suspense fallback="Sign in">
           <Await resolve={isLoggedIn} errorElement="Sign in">
```

#### Step 1.7: Add the selected locale to the root route

1. Include the selected locale in the root route's loader data.
2. Make sure to redirect to the 404 page if the requested locale is not supported.
3. Add a key prop to the `PageLayout` component to make sure it re-renders
when the locale changes.

##### File: /app/root.tsx

```diff
@@ -77,6 +77,7 @@ export async function loader(args: LoaderFunctionArgs) {
   return {
     ...deferredData,
     ...criticalData,
+    selectedLocale: args.context.storefront.i18n,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
       storefront,
@@ -162,7 +163,12 @@ export function Layout({children}: {children?: React.ReactNode}) {
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

### Step 2: Localizing the individual routes

In this section, we'll add localization to the individual routes using the language [dynamic segment](https://reactrouter.com/start/data/routing#optional-segments).

#### Step 2.1: Add language dynamic segment to the desired routes

To implement path-based localization, add a language
dynamic segment to your localized routes (for example, renaming `routes/_index.tsx`
to `routes/($locale)._index.tsx`).

For brevity, we'll focus on the home page, the cart page, and the product page in this example. In your app, you should do this for all the app routes.

#### Step 2.2: Add localization to the home page

1. Add the dynamic segment to the home page route.
2. Use the new `Link` component as a drop-in replacement.

> [!NOTE]
> Rename `app/routes/_index.tsx` to `app/routes/($locale)._index.tsx`.

##### File: [($locale)._index.tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale)._index.tsx)

```tsx
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData, type MetaFunction} from 'react-router';
import {Suspense} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {Link} from '../components/Link';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: LoaderFunctionArgs) {
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
async function loadCriticalData({context}: LoaderFunctionArgs) {
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
function loadDeferredData({context}: LoaderFunctionArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
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

```

#### Step 2.3: Add localization to the cart page

Add the dynamic segment to the cart page route.

> [!NOTE]
> Rename `app/routes/cart.tsx` to `app/routes/($locale).cart.tsx`.

##### File: [($locale).cart.tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).cart.tsx)

```tsx
import {type MetaFunction, useLoaderData} from 'react-router';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type HeadersFunction,
} from '@shopify/remix-oxygen';
import {CartMain} from '~/components/CartMain';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: ActionFunctionArgs) {
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

export async function loader({context}: LoaderFunctionArgs) {
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

```

#### Step 2.4: Add localization to the product page

1. Add the dynamic segment to the product page route.
2. Update the `meta` function to also update the canonical URL to use the
localized prefix.

> [!NOTE]
> Rename `app/routes/products.$handle.tsx` to `app/routes/($locale).products.$handle.tsx`.

##### File: [($locale).products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).products.$handle.tsx)

```tsx
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from 'react-router';
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
import {WithLocale, DEFAULT_LOCALE} from '~/lib/i18n';

export const meta: MetaFunction<typeof loader> = (args) => {
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

export async function loader(args: LoaderFunctionArgs) {
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
}: LoaderFunctionArgs) {
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
function loadDeferredData({context, params}: LoaderFunctionArgs) {
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

```

#### Step 2.5: Add a utility route to validate the locale.

Add a utility route in `$(locale).tsx` that will use `localeMatchesPrefix`
to validate the locale from the URL params. If the locale is invalid,
the route will throw a 404 error.

##### File: [($locale).tsx](https://github.com/Shopify/hydrogen/blob/4129da578f9d603187bd10945ae60e1934df0e8a/cookbook/recipes/markets/ingredients/templates/skeleton/app/routes/($locale).tsx)

```tsx
import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {localeMatchesPrefix} from '~/lib/i18n';

export async function loader({params}: LoaderFunctionArgs) {
  if (!localeMatchesPrefix(params.locale ?? null)) {
    throw new Response('Invalid locale', {status: 404});
  }

  return null;
}

```

#### Step 2.6: Update the sitemap route's locales.

Update the sitemap route to use the locales included in `SUPPORTED_LOCALES`.

##### File: /app/routes/sitemap.$type.$page[.xml].tsx

```diff
@@ -1,5 +1,6 @@
 import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {getSitemap} from '@shopify/hydrogen';
+import {SUPPORTED_LOCALES} from '../lib/i18n';
 
 export async function loader({
   request,
@@ -10,7 +11,9 @@ export async function loader({
     storefront,
     request,
     params,
-    locales: ['EN-US', 'EN-CA', 'FR-CA'],
+    locales: SUPPORTED_LOCALES.map(
+      (locale) => `${locale.language}-${locale.country}`,
+    ),
     getLink: ({type, baseUrl, handle, locale}) => {
       if (!locale) return `${baseUrl}/${type}/${handle}`;
       return `${baseUrl}/${locale}/${type}/${handle}`;
```

#### Step 2.7: Update the useVariantUrl function.

Remove the `pathname` parameter from the `useVariantUrl` function, and the logic that prepends the locale to the path.

##### File: /app/lib/variants.ts

```diff
@@ -1,4 +1,3 @@
-import { useLocation } from 'react-router';
 import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
 import {useMemo} from 'react';
 
@@ -6,35 +5,25 @@ export function useVariantUrl(
   handle: string,
   selectedOptions?: SelectedOption[],
 ) {
-  const {pathname} = useLocation();
-
   return useMemo(() => {
     return getVariantUrl({
       handle,
-      pathname,
       searchParams: new URLSearchParams(),
       selectedOptions,
     });
-  }, [handle, selectedOptions, pathname]);
+  }, [handle, selectedOptions]);
 }
 
 export function getVariantUrl({
   handle,
-  pathname,
   searchParams,
   selectedOptions,
 }: {
   handle: string;
-  pathname: string;
   searchParams: URLSearchParams;
   selectedOptions?: SelectedOption[];
 }) {
-  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
-  const isLocalePathname = match && match.length > 0;
-
-  const path = isLocalePathname
-    ? `${match![0]}products/${handle}`
-    : `/products/${handle}`;
+  const path = `/products/${handle}`;
 
   selectedOptions?.forEach((option) => {
     searchParams.set(option.name, option.value);
```

## Deleted Files

- [`templates/skeleton/app/routes/_index.tsx`](templates/skeleton/app/routes/_index.tsx)
- [`templates/skeleton/app/routes/cart.tsx`](templates/skeleton/app/routes/cart.tsx)
- [`templates/skeleton/app/routes/products.$handle.tsx`](templates/skeleton/app/routes/products.$handle.tsx)

</recipe_implementation>