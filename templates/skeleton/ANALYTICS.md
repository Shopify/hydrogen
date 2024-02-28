# Decentralized Analytics Instrumentation

Example demonstrating an instrumentation approach for 1P and 3P analytics leveraging
existing components and routes.

## Setup

## 1. Consent Banner

Import Hydrogen's `<ShopifyCookieBanner />` component in the `root.tsx` layout

```diff
+ import {ShopifyCookieBanner} from '@shopify/hydrogen';
```

Pass the required environment variables to the client by changing the loader to:

```diff
export async function loader({context}: LoaderFunctionArgs) {
  // other code...

  return defer(
    {
      cart: cartPromise,
      footer: footerPromise,
      header: await headerPromise,
      isLoggedIn: isLoggedInPromise,
      publicStoreDomain,
+     env: {
+       checkoutRootDomain: env.PUBLIC_CHECKOUT_DOMAIN,
+       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+       storefrontRootDomain: env.PUBLIC_PREVIEW_DOMAIN,
+     },
    },
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}
```

Render the `<ShopifyCookieBanner />` inside the root's `App` component passing the
`env` variables returned from the loader:

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
        <Layout {...data}>
          <Outlet />
        </Layout>
+       <ShopifyCookieBanner {...data.env} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}
```

### 2. Add the Analytics instrumentation provider

> [!NOTE]
> The Analytics provider sole purpose is to make the `userConsent` prop available
> to all event triggering components.

In `root.tsx` first import the `Analytics` component

```diff
+ import {Analytics} from '@shopify/hydrogen';
```

Wrap the application's `Layout` with the Analytics provider:

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
+        <Analytics.Provider
+           userConsent={() => {
+             // NOTE: Optional if using ShopifyCookieBanner
+             if (typeof window === 'undefined') return;
+
+             // Using 1P Consent API?
+             return Boolean(window?.Shopify?.currentVisitorConsent()?.marketing)
+
+             // or if using 3P Consent API?
+             return window.oneTrust.getConsent()
+         }}
+       >
          <Layout {...data}>
            <Outlet />
          </Layout>
+       </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}
```

### 2. Navigation events

To track navigation events such as `page_view`, `product_view` etc add the relevant
compound Analytics component to the route that you wish to track

Track homepage `page_view` by changing `routes/_index.tsx` to:

```diff
+ import {Analytics} from '@shopify/hydrogen/Analytics';
```

Add the `<Analytics.PageView />` component to the route component

```diff
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
+     <Analytics.PageView<{handle: string}>
+       page={{handle: '/'}}
+       onPageView={() => {
+         // 3P event tracking
+         analytics.page();
+       }}
+     />
    </div>
  );
}
```

Track product page visits `product_view` by changing `routes/products.$handle.tsx`
to:

```diff
+ import {Analytics} from '@shopify/hydrogen/Analytics';
```

Add the `<Analytics.ProductView />` component to the route component

```diff
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
+     <Analytics.ProductView<ProductFragment>
+       product={product}
+       onProductView={(payload) => {
+         window?.dataLayer?.push({
+           event: 'product_view',
+           ecommerce: { detail: { products: [payload] } },
+         });
+       }}
+     />
    </div>
  );
}
```

### 3. Product route events

To track variant selection events we leverage the new `onSelectedVariant` callback
prop on Hydrogen's `<VariantSelector />` component

```diff
function ProductForm({
  product,
  selectedVariant,
  variants,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Array<ProductVariantFragment>;
}) {
  return (
    <div className="product-form">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants}
+       onSelectedVariant={(selectedVariant) => {
+         // Optional - 3P selected variant event
+         window.dataLayer.push({
+           event: 'product_view',
+           ecommerce: { detail: { products: [selectedVariant] } },
+         });
+
+         // NOTE - 1P event automatically fired by VariantSelector
+       }}
      >
        {({option}) => <ProductOptions key={option.name} option={option} />}
      </VariantSelector>
      <br />
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}
```

### 4. Cart events

To track cart events, we leverage the new `on[EventName]` callback prop on the
`<CartForm />` component.

#### 4.1 Add to cart event

```diff
function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: CartLineInput[];
  onClick?: () => void;
}) {
  return (
    <CartForm
      route="/cart"
      inputs={{lines}}
      action={CartForm.ACTIONS.LinesAdd}
+     onLinesAdd={(event) => {
+       // Optional - 3P event
+       window.dataLayer.push({
+         event: 'add_to_cart',
+         ecommerce: { add: lines },
+       });
+
+       // Note - 1P event fired automatically by CartForm
+     }}
    >
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}
```

#### 4.2 Remove from cart event

```diff
function CartLineRemoveButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
+     onLinesRemove={() => {
+       // Optional - 3P Event
+       window.dataLayer.push({
+         event: 'remove_from_cart',
+         ecommerce: { remove: { products: lineIds.map((id) => ({id})) }},
+       });
+     }}
    >
      <button type="submit">Remove</button>
    </CartForm>
  );
}
```

#### 4.3 Discount code event

```diff
function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
+     onDiscountCodesUpdate={() => {
+       // Optional - 3P event
+       window.dataLayer.push({
+         event: 'apply_discount',
+         ecommerce: {
+           promo_click: { promotions: [ { id: discountCodes?.join(', ') }]}
+         }
+       });
+     }}
    >
      {children}
    </CartForm>
  );
}
```
