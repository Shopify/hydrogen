# Hydrogen example: Shopify Analytics & Consent (unstable)

This folder contains an end-to-end example of how to implement analytics for Hydrogen. Hydrogen supports both Shopify analytics, as well as third-party services.

Hydrogen includes built in support for the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy), a browser-based JavaScript API that you can use to display cookie-consent banners and verify data processing permissions.

## Requirements

- [Configure customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings?shpxid=9f9c768e-AC66-497C-98D0-701334C8173E) - You can configure and manage customer privacy settings within your Shopify admin to help comply with privacy and data protection laws.
- [Add a cookie banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings#add-a-cookie-banner) - A cookie banner is a notification displayed on a website that informs visitors about the use of cookies and asks for their consent for data collection and tracking activities.

## Install

Set up a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template analytics
```

## Key files

The following files have been added (🆕) or changed from the default Hydration template:

| File                                                                                              | Description   |
| ------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------|
| 🆕 [`.env.example`](.env.example)                                                                 | Example environment variable file. Adds a new required env variable `PUBLIC_CHECKOUT_DOMAIN`
| 🆕 [`app/components/CustomAnalytics.tsx`](app/components/CustomAnalytics.tsx)                     | A component that subscribes to all default analytics events and can be used to publish events to third-party services.
| [`env.d.ts`](/env.d.ts)                                                                    |  Updated `Env` interface to include `PUBLIC_CHECKOUT_DOMAIN`. Required for TypeScript only.
| [`app/root.tsx`](app/root.tsx)                                                                    | Updated the root layout with the `Analytics` provider and `getShopAnalytics` |
| [`app/entry.server.tsx`](app/entry.server.tsx)                                                  | Updated the `createContentSecurityPolicy` with `checkoutDomain` and `storeDomain` properties |
| [`app/routes/products.$handle.tsx`](app/routes/products.$handle.tsx)                              | Added Analytics.ProductView component |
| [`app/routes/collections.$handle.tsx`](app/routes/collections.$handle.tsx)                        | Added Analytics.CollectionView component |
| [`app/routes/cart.tsx`](app/routes/cart.tsx)                        | Added Analytics.CartView component |
| [`app/routes/search.tsx`](app/routes/search.tsx)                        | Added Analytics.SearchView component |

## Instructions

### 1. Enable Customer Privacy / Cookie Consent Banner

In the Shopify admin, head over to / Settings / Customer Privacy / Cookie Banner

#### 1.1 Configure the region(s) visibility for the banner

<img src="/public/banner-region-visibility.jpeg">

#### 1.2 (Optional) Customize the appearance of the Cookie banner and Cookie preferences

<img src="/public/banner-appearance.jpeg">

#### 1.3 (Optional) Customize the position of the banner

<img src="/public/banner-position.jpeg">

### 2. Copy over the new files

- In your Hydrogen app, create the new files from the file list above, copying in the code as you go.
- If you already have a `.env` file, copy over these key-value pairs:
  - `PUBLIC_CHECKOUT_DOMAIN` - e.g `checkout.hydrogen.shop`

### 3. Edit the `root.tsx` layout file

#### 3.1 Import the required hydrogen `Analytics` component and `getShopAnalytics` utility

> [!TIP]
> Importing `UNSTABLE_Analytics as Analytics` makes it easier to upgrade to the stable component later, since you’ll only need to update your import statements.

```diff
import {
  useNonce,
+ UNSTABLE_Analytics as Analytics,
+ getShopAnalytics
} from '@shopify/hydrogen';
```

#### 3.2 Import the `CustomAnalytics` component

```diff
+ import {CustomAnalytics} from '~/components/CustomAnalytics'
```

#### 3.3 Update the `loader` function

```diff
export async function loader({context}: LoaderFunctionArgs) {
+ // 1. Extract the `env` from the context
+ const {storefront, customerAccount, cart, env} = context;

  // ...other code

  return defer(
    {
      // ...other code

+     // 2. return the `shop` environment for analytics
+     shop: getShopAnalytics(context),

+     // 3. return the `consent` config for analytics
+     consent: {
+       checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
+       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+     },
    },
    // other code...
  );
}
```

#### 3.4 Update the `App` component

Wrap the application `Layout` with the `Analytics` provider. The analytics provider is
responsible for managing and orchestrating cart, custom and page view events.

```diff
export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
+       <Analytics.Provider
+         cart={data.cart}
+         shop={data.shop}
+         consent={data.consent}
+         customData={{foo: 'bar'}}
+       >
          <Layout {...data}>
            <Outlet />
          </Layout>
+       </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
```

Add the `CustomAnalytics` component to listen to events:

```diff
export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics.Provider
          cart={data.cart}
          shop={data.shop}
          consent={data.consent}
          customData={{foo: 'bar'}}
        >
          <Layout {...data}>
            <Outlet />
          </Layout>
+         <CustomAnalytics />
        </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
```

[View the complete component file](app/root.tsx) to see these updates in context.

## 4. Update the `product`, `collection`, `cart`, `search` routes

Add the `Analytics.ProductView` component to the product details page route, `/app/routes/product.$handle.tsx`:

```diff
import {
  //...other code
+ UNSTABLE_Analytics as Analytics,
} from '@shopify/hydrogen';

export default function Product() {
  const {product, variants} = useLoaderData<typeof loader>();
  const {selectedVariant} = product;
  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <ProductMain
        selectedVariant={selectedVariant}
        product={product}
        variants={variants}
      />
+     <Analytics.ProductView
+       data={{
+         products: [
+           {
+             id: product.id,
+             title: product.title,
+             price: selectedVariant?.price.amount || '0',
+             vendor: product.vendor,
+             variantId: selectedVariant?.id || '',
+             variantTitle: selectedVariant?.title || '',
+             quantity: 1,
+           },
+         ],
+         url: window.location.href,
+       }}
+     />
    </div>
  );
}
```

Add the `Analytics.CollectionView` component to the collection route, `/app/routes/collection.$handle.tsx`:

```diff
import {
  //...other code
+ UNSTABLE_Analytics as Analytics,
} from '@shopify/hydrogen';

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <p className="collection-description">{collection.description}</p>
      <Pagination connection={collection.products}>
        {({nodes, isLoading, PreviousLink, NextLink}) => (
          <>
            <PreviousLink>
              {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
            </PreviousLink>
            <ProductsGrid products={nodes} />
            <br />
            <NextLink>
              {isLoading ? 'Loading...' : <span>Load more ↓</span>}
            </NextLink>
          </>
        )}
      </Pagination>
+     <Analytics.CollectionView
+       data={{
+         collection: {
+           id: collection.id,
+           handle: collection.handle,
+         },
+         url: window.location.href,
+       }}
+     />
    </div>
  );
}
```

Add the `Analytics.CartView` component to the cart route `/app/routes/cart.tsx`

```diff
import {
  //...other code
+ UNSTABLE_Analytics as Analytics,
} from '@shopify/hydrogen';

export default function Cart() {
  const rootData = useRootLoaderData();
  const cartPromise = rootData.cart;

  return (
    <div className="cart">
      <h1>Cart</h1>
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await
          resolve={cartPromise}
          errorElement={<div>An error occurred</div>}
        >
          {(cart) => {
            return <CartMain layout="page" cart={cart} />;
          }}
        </Await>
      </Suspense>
+     <Analytics.CartView />
    </div>
  );
}
```

Add the `Analytics.SearchView` component to the search route `/app/routes/search.tsx`

```diff

```diff
import {
  //...other code
+ UNSTABLE_Analytics as Analytics,
} from '@shopify/hydrogen';


export default function SearchPage() {
  const {searchTerm, searchResults} = useLoaderData<typeof loader>();

  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm searchTerm={searchTerm} />
      {!searchTerm || !searchResults.totalResults ? (
        <NoSearchResults />
      ) : (
        <SearchResults
          results={searchResults.results}
          searchTerm={searchTerm}
        />
      )}
+     <Analytics.SearchView
+       data={{searchTerm, searchResults, url: window.location.href}}
+     />
    </div>
  );
}
```

## 5. Update Content Security Policy

Add `storeDomain` and `checkoutDomain` to the Content-Security-Policy

```diff
//...other code

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
- const {nonce, header, NonceProvider} = createContentSecurityPolicy();
+ const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+   checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
+   storeDomain: context.env.PUBLIC_STORE_DOMAIN,
+ });

  //...other code
}
```

[View the complete component file](app/entry.server.tsx) to see these updates in context.

## 6. (Optional) Publishing and subscribing to custom event(s)

Modify `app/components/Header.tsx` to trigger a `custom_sidecart_viewed` when the cart icon
is toggled

```diff
+ import {useAnalytics} from '@shopify/hydrogen'

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
+ const {publish} = useAnalytics();
+ function publishSideCartViewed() {
+   publish('custom_sidecart_viewed', {cart});
+ }
  return (
    <Suspense
-     fallback={<CartBadge count={0} />}
+     fallback={<CartBadge count={0} onClick={publishSideCartViewed} />}
    >
      <Await resolve={cart}>
        {(cart) => {
          if (!cart)
-           return <CartBadge count={0} />;
+           return <CartBadge count={0} onClick={publishSideCartViewed} />;
          return (
            <CartBadge
              count={cart.totalQuantity || 0}
+             onClick={publishSideCartViewed}
            />
          );
        }}
      </Await>
    </Suspense>
  );
}
```

[View the complete component file](app/components/Header.tsx) to see these updates in context.

## 7. (TypeScript only) - Add the new environment variable to the `ENV` type definition

Update the `remix.d.ts` file

```diff
// ...other code

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
+   PUBLIC_CHECKOUT_DOMAIN: string;
  }
}

// ...other code
```

[View the complete component file](remix.d.ts) to see these updates in context.
