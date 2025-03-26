# 🧑‍🍳 Subscriptions

This recipe adds subscription capabilities to your Hydrogen storefront by implementing [selling plan groups](https://shopify.dev/docs/api/storefront/latest/objects/SellingPlanGroup) and options. Customers can choose between one-time purchases or recurring subscriptions when available.

The implementation:
1. Modifies product detail pages to display subscription options with accurate pricing
2. Adds a SellingPlanSelector component that presents available subscription options
3. Enhances GraphQL fragments to fetch all necessary selling plan data
4. Displays subscription details on applicable cart line items
With this recipe, merchants can offer flexible purchasing options while maintaining a seamless customer experience.


## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/Cart.tsx`](ingredients/templates/skeleton/app/components/Cart.tsx) |  |
| [`app/components/SellingPlanSelector.tsx`](ingredients/templates/skeleton/app/components/SellingPlanSelector.tsx) |  |
| [`app/styles/selling-plan.css`](ingredients/templates/skeleton/app/styles/selling-plan.css) |  |

## 🍱 Steps

### 1. Requirements

This recipe comes pre-configured for our demo storefront using an example subscription product with the handle `shopify-wax`.
#### Setting Up in Your Own Store
To implement subscriptions in your store:
1. Install a [Shopify Subscriptions](https://apps.shopify.com/shopify-subscriptions) app
2. Use the app to create selling plans for your products
3. Assign these selling plans to any products you want to offer as subscriptions


### 2. Copy ingredients

Copy the ingredients from the template directory to the current directory.

- `app/components/Cart.tsx`
- `app/components/SellingPlanSelector.tsx`
- `app/styles/selling-plan.css`

### 3. app/components/CartLineItem.tsx

This step updates the CartLineItem component to show subscription information when a customer adds a subscription product to their cart.
The component now: - Extracts subscription details (sellingPlanAllocation) from cart line data - Displays the subscription plan name when available


#### File: [`app/components/CartLineItem.tsx`](/templates/skeleton/app/components/CartLineItem.tsx)

```diff
index 26102b61..4ec8324b 100644
--- a/templates/skeleton/app/components/CartLineItem.tsx
+++ b/templates/skeleton/app/components/CartLineItem.tsx
@@ -3,8 +3,8 @@ import type {CartLayout} from '~/components/CartMain';
 import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
 import {useVariantUrl} from '~/lib/variants';
 import {Link} from '@remix-run/react';
-import {ProductPrice} from './ProductPrice';
-import {useAside} from './Aside';
+import {ProductPrice} from '~/components/ProductPrice';
+import {useAside} from '~/components/Aside';
 import type {CartApiQueryFragment} from 'storefrontapi.generated';
 
 type CartLine = OptimisticCartLine<CartApiQueryFragment>;
@@ -20,7 +20,9 @@ export function CartLineItem({
   layout: CartLayout;
   line: CartLine;
 }) {
-  const {id, merchandise} = line;
+  // Get the selling plan allocation
+  const {id, merchandise, sellingPlanAllocation} = line;
+
   const {product, title, image, selectedOptions} = merchandise;
   const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
   const {close} = useAside();
@@ -54,6 +56,12 @@ export function CartLineItem({
         </Link>
         <ProductPrice price={line?.cost?.totalAmount} />
         <ul>
+          {/* Optionally render the selling plan name if available */}
+          {sellingPlanAllocation && (
+            <li key={sellingPlanAllocation.sellingPlan.name}>
+              <small>{sellingPlanAllocation.sellingPlan.name}</small>
+            </li>
+          )}
           {selectedOptions.map((option) => (
             <li key={option.name}>
               <small>

```

### 4. app/lib/fragments.ts

# Add Selling Plan Data to Cart Queries
Updates GraphQL cart fragments to include selling plan information. Adds the `sellingPlanAllocation` field with plan names to all cart line fragments, enabling the display of subscription details (like "Subscribe and save 10%") directly in the cart.


#### File: [`app/lib/fragments.ts`](/templates/skeleton/app/lib/fragments.ts)

```diff
index dc4426a9..cfe3a938 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -54,6 +54,11 @@ export const CART_QUERY_FRAGMENT = `#graphql
         }
       }
     }
+    sellingPlanAllocation {
+      sellingPlan {
+         name
+      }
+    }
   }
   fragment CartLineComponent on ComponentizableCartLine {
     id
@@ -104,6 +109,11 @@ export const CART_QUERY_FRAGMENT = `#graphql
         }
       }
     }
+    sellingPlanAllocation {
+      sellingPlan {
+         name
+      }
+    }
   }
   fragment CartApiQuery on Cart {
     updatedAt

```

### 5. app/routes/_index.tsx

Removes collection and product components from homepage. Replaces with single heading and link to subscription product example `/products/shopify-wax`.

#### File: [`app/routes/_index.tsx`](/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 9fa33642..2023c689 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,182 +1,12 @@
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {Await, useLoaderData, Link, type MetaFunction} from '@remix-run/react';
-import {Suspense} from 'react';
-import {Image, Money} from '@shopify/hydrogen';
-import type {
-  FeaturedCollectionFragment,
-  RecommendedProductsQuery,
-} from 'storefrontapi.generated';
-
-export const meta: MetaFunction = () => {
-  return [{title: 'Hydrogen | Home'}];
-};
-
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
-
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
-
-  return {...deferredData, ...criticalData};
-}
-
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({context}: LoaderFunctionArgs) {
-  const [{collections}] = await Promise.all([
-    context.storefront.query(FEATURED_COLLECTION_QUERY),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
-
-  return {
-    featuredCollection: collections.nodes[0],
-  };
-}
-
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context}: LoaderFunctionArgs) {
-  const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-
-  return {
-    recommendedProducts,
-  };
-}
+import {Link} from '@remix-run/react';
 
 export default function Homepage() {
-  const data = useLoaderData<typeof loader>();
   return (
     <div className="home">
-      <FeaturedCollection collection={data.featuredCollection} />
-      <RecommendedProducts products={data.recommendedProducts} />
+      <h1>Example subscription</h1>
+      <Link style={{textDecoration: 'underline'}} to="/products/shopify-wax">
+        Shopify Wax
+      </Link>
     </div>
   );
 }
-
-function FeaturedCollection({
-  collection,
-}: {
-  collection: FeaturedCollectionFragment;
-}) {
-  if (!collection) return null;
-  const image = collection?.image;
-  return (
-    <Link
-      className="featured-collection"
-      to={`/collections/${collection.handle}`}
-    >
-      {image && (
-        <div className="featured-collection-image">
-          <Image data={image} sizes="100vw" />
-        </div>
-      )}
-      <h1>{collection.title}</h1>
-    </Link>
-  );
-}
-
-function RecommendedProducts({
-  products,
-}: {
-  products: Promise<RecommendedProductsQuery | null>;
-}) {
-  return (
-    <div className="recommended-products">
-      <h2>Recommended Products</h2>
-      <Suspense fallback={<div>Loading...</div>}>
-        <Await resolve={products}>
-          {(response) => (
-            <div className="recommended-products-grid">
-              {response
-                ? response.products.nodes.map((product) => (
-                    <Link
-                      key={product.id}
-                      className="recommended-product"
-                      to={`/products/${product.handle}`}
-                    >
-                      <Image
-                        data={product.images.nodes[0]}
-                        aspectRatio="1/1"
-                        sizes="(min-width: 45em) 20vw, 50vw"
-                      />
-                      <h4>{product.title}</h4>
-                      <small>
-                        <Money data={product.priceRange.minVariantPrice} />
-                      </small>
-                    </Link>
-                  ))
-                : null}
-            </div>
-          )}
-        </Await>
-      </Suspense>
-      <br />
-    </div>
-  );
-}
-
-const FEATURED_COLLECTION_QUERY = `#graphql
-  fragment FeaturedCollection on Collection {
-    id
-    title
-    image {
-      id
-      url
-      altText
-      width
-      height
-    }
-    handle
-  }
-  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...FeaturedCollection
-      }
-    }
-  }
-` as const;
-
-const RECOMMENDED_PRODUCTS_QUERY = `#graphql
-  fragment RecommendedProduct on Product {
-    id
-    title
-    handle
-    priceRange {
-      minVariantPrice {
-        amount
-        currencyCode
-      }
-    }
-    images(first: 1) {
-      nodes {
-        id
-        url
-        altText
-        width
-        height
-      }
-    }
-  }
-  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...RecommendedProduct
-      }
-    }
-  }
-` as const;

```

</details>

### 6. app/routes/products.$handle.tsx

Adds SellingPlanSelector component to display subscription options on product pages. Handles pricing adjustments, maintains selection state via URL parameters, and updates add-to-cart functionality. Fetches subscription data through new GraphQL fragments.

#### File: [`app/routes/products.$handle.tsx`](/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 0028b423..bbcc9784 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,46 +1,53 @@
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {useLoaderData, type MetaFunction} from '@remix-run/react';
+import {Suspense} from 'react';
+import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
+  Await,
+  Link,
+  useLoaderData,
+  type MetaFunction,
+  type FetcherWithComponents,
+} from '@remix-run/react';
+import type {
+  ProductFragment,
+  ProductVariantsQuery,
+  ProductVariantFragment,
+  SellingPlanFragment,
+} from 'storefrontapi.generated';
+import {
+  Image,
+  Money,
+  VariantSelector,
+  type VariantOption,
   getSelectedProductOptions,
+  CartForm,
   Analytics,
-  useOptimisticVariant,
-  getProductOptions,
-  getAdjacentAndFirstAvailableVariants,
-  useSelectedOptionInUrlParam,
+  type CartViewPayload,
+  useAnalytics,
+  type OptimisticCartLineInput,
 } from '@shopify/hydrogen';
-import {ProductPrice} from '~/components/ProductPrice';
-import {ProductImage} from '~/components/ProductImage';
-import {ProductForm} from '~/components/ProductForm';
+import type {
+  SelectedOption,
+  CurrencyCode,
+} from '@shopify/hydrogen/storefront-api-types';
+import {getVariantUrl} from '~/lib/variants';
+import {useAside} from '~/components/Aside';
+// Import the SellingPlanSelector component and type
+import {
+  SellingPlanSelector,
+  type SellingPlanGroup,
+} from '~/components/SellingPlanSelector';
+import sellingPanStyle from '~/styles/selling-plan.css?url';
+import type {LinksFunction} from '@remix-run/node';
+
+export const links: LinksFunction = () => [
+  {rel: 'stylesheet', href: sellingPanStyle},
+];
 
 export const meta: MetaFunction<typeof loader> = ({data}) => {
-  return [
-    {title: `Hydrogen | ${data?.product.title ?? ''}`},
-    {
-      rel: 'canonical',
-      href: `/products/${data?.product.handle}`,
-    },
-  ];
+  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
 };
 
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
-
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
-
-  return {...deferredData, ...criticalData};
-}
-
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({
-  context,
-  params,
-  request,
-}: LoaderFunctionArgs) {
+export async function loader({params, request, context}: LoaderFunctionArgs) {
   const {handle} = params;
   const {storefront} = context;
 
@@ -48,78 +55,111 @@ async function loadCriticalData({
     throw new Error('Expected product handle to be defined');
   }
 
-  const [{product}] = await Promise.all([
-    storefront.query(PRODUCT_QUERY, {
-      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
-    }),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
+  // await the query for the critical product data
+  const {product} = await storefront.query(PRODUCT_QUERY, {
+    variables: {handle, selectedOptions: getSelectedProductOptions(request)},
+  });
 
   if (!product?.id) {
     throw new Response(null, {status: 404});
   }
 
+  // Initialize the selectedSellingPlan to null
+  let selectedSellingPlan = null;
+
+  // Get the selected selling plan id from the request url
+  const selectedSellingPlanId =
+    new URL(request.url).searchParams.get('selling_plan') ?? null;
+
+  // Get the selected selling plan bsed on the selectedSellingPlanId
+  if (selectedSellingPlanId) {
+    const selectedSellingPlanGroup =
+      product.sellingPlanGroups.nodes?.find((sellingPlanGroup) => {
+        return sellingPlanGroup.sellingPlans.nodes?.find(
+          (sellingPlan: SellingPlanFragment) =>
+            sellingPlan.id === selectedSellingPlanId,
+        );
+      }) ?? null;
+
+    if (selectedSellingPlanGroup) {
+      selectedSellingPlan =
+        selectedSellingPlanGroup.sellingPlans.nodes.find((sellingPlan) => {
+          return sellingPlan.id === selectedSellingPlanId;
+        }) ?? null;
+    }
+  }
+
+  const firstVariant = product.variants.nodes[0];
+  const firstVariantIsDefault = Boolean(
+    firstVariant.selectedOptions.find(
+      (option: SelectedOption) =>
+        option.name === 'Title' && option.value === 'Default Title',
+    ),
+  );
+
+  if (firstVariantIsDefault) {
+    product.selectedVariant = firstVariant;
+  } else {
+    // if no selected variant was returned from the selected options,
+    // we redirect to the first variant's url with it's selected options applied
+    if (!product.selectedVariant) {
+      throw redirectToFirstVariant({product, request});
+    }
+  }
+
+  // In order to show which variants are available in the UI, we need to query
+  // all of them. But there might be a *lot*, so instead separate the variants
+  // into it's own separate query that is deferred. So there's a brief moment
+  // where variant options might show as available when they're not, but after
+  // this deffered query resolves, the UI will update.
+  const variants = storefront.query(VARIANTS_QUERY, {
+    variables: {handle},
+  });
+
   return {
     product,
+    variants,
+    // Pass the selectedSellingPlan to the client
+    selectedSellingPlan,
   };
 }
 
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context, params}: LoaderFunctionArgs) {
-  // Put any API calls that is not critical to be available on first page render
-  // For example: product reviews, product recommendations, social feeds.
+function redirectToFirstVariant({
+  product,
+  request,
+}: {
+  product: ProductFragment;
+  request: Request;
+}) {
+  const url = new URL(request.url);
+  const firstVariant = product.variants.nodes[0];
 
-  return {};
+  return redirect(
+    getVariantUrl({
+      pathname: url.pathname,
+      handle: product.handle,
+      selectedOptions: firstVariant.selectedOptions,
+      searchParams: new URLSearchParams(url.search),
+    }),
+    {
+      status: 302,
+    },
+  );
 }
 
 export default function Product() {
-  const {product} = useLoaderData<typeof loader>();
-
-  // Optimistically selects a variant with given available variant information
-  const selectedVariant = useOptimisticVariant(
-    product.selectedOrFirstAvailableVariant,
-    getAdjacentAndFirstAvailableVariants(product),
-  );
-
-  // Sets the search param to the selected variant without navigation
-  // only when no search params are set in the url
-  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
-
-  // Get the product options array
-  const productOptions = getProductOptions({
-    ...product,
-    selectedOrFirstAvailableVariant: selectedVariant,
-  });
-
-  const {title, descriptionHtml} = product;
-
+  const {product, variants, selectedSellingPlan} =
+    useLoaderData<typeof loader>();
+  const {selectedVariant} = product;
   return (
     <div className="product">
       <ProductImage image={selectedVariant?.image} />
-      <div className="product-main">
-        <h1>{title}</h1>
-        <ProductPrice
-          price={selectedVariant?.price}
-          compareAtPrice={selectedVariant?.compareAtPrice}
-        />
-        <br />
-        <ProductForm
-          productOptions={productOptions}
-          selectedVariant={selectedVariant}
-        />
-        <br />
-        <br />
-        <p>
-          <strong>Description</strong>
-        </p>
-        <br />
-        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
-        <br />
-      </div>
+      <ProductMain
+        selectedVariant={selectedVariant}
+        product={product}
+        variants={variants}
+        selectedSellingPlan={selectedSellingPlan}
+      />
       <Analytics.ProductView
         data={{
           products: [
@@ -139,6 +179,437 @@ export default function Product() {
   );
 }
 
+function ProductImage({image}: {image: ProductVariantFragment['image']}) {
+  if (!image) {
+    return <div className="product-image" />;
+  }
+  return (
+    <div className="product-image">
+      <Image
+        alt={image.altText || 'Product Image'}
+        aspectRatio="1/1"
+        data={image}
+        key={image.id}
+        sizes="(min-width: 45em) 50vw, 100vw"
+      />
+    </div>
+  );
+}
+
+function ProductMain({
+  selectedVariant,
+  product,
+  variants,
+  selectedSellingPlan,
+}: {
+  product: ProductFragment;
+  selectedVariant: ProductFragment['selectedVariant'];
+  variants: Promise<ProductVariantsQuery>;
+  selectedSellingPlan: SellingPlanFragment | null;
+}) {
+  const {title, descriptionHtml, sellingPlanGroups} = product;
+
+  return (
+    <div className="product-main">
+      <h1>{title}</h1>
+      <ProductPrice
+        selectedVariant={selectedVariant}
+        selectedSellingPlan={selectedSellingPlan}
+      />
+      <br />
+      <Suspense
+        fallback={
+          <ProductForm
+            product={product}
+            selectedVariant={selectedVariant}
+            variants={[]}
+            selectedSellingPlan={selectedSellingPlan}
+            sellingPlanGroups={sellingPlanGroups}
+          />
+        }
+      >
+        <Await
+          errorElement="There was a problem loading product variants"
+          resolve={variants}
+        >
+          {(data) => (
+            <ProductForm
+              product={product}
+              selectedVariant={selectedVariant}
+              variants={data.product?.variants.nodes || []}
+              selectedSellingPlan={selectedSellingPlan}
+              sellingPlanGroups={sellingPlanGroups}
+            />
+          )}
+        </Await>
+      </Suspense>
+      <br />
+      <br />
+      <p>
+        <strong>Description</strong>
+      </p>
+      <br />
+      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
+      <br />
+    </div>
+  );
+}
+
+function ProductPrice({
+  selectedVariant,
+  selectedSellingPlan,
+}: {
+  selectedVariant: ProductFragment['selectedVariant'];
+  selectedSellingPlan: SellingPlanFragment | null;
+}) {
+  if (selectedSellingPlan) {
+    return (
+      <SellingPlanPrice
+        selectedSellingPlan={selectedSellingPlan}
+        selectedVariant={selectedVariant}
+      />
+    );
+  }
+
+  return (
+    <div className="product-price">
+      {selectedVariant?.compareAtPrice ? (
+        <>
+          <p>Sale</p>
+          <br />
+          <div className="product-price-on-sale">
+            {selectedVariant ? <Money data={selectedVariant.price} /> : null}
+            <s>
+              <Money data={selectedVariant.compareAtPrice} />
+            </s>
+          </div>
+        </>
+      ) : (
+        selectedVariant?.price && <Money data={selectedVariant?.price} />
+      )}
+    </div>
+  );
+}
+
+type SellingPlanPrice = {
+  amount: number;
+  currencyCode: CurrencyCode;
+};
+
+/*
+  Render the selected selling plan price is available
+*/
+function SellingPlanPrice({
+  selectedSellingPlan,
+  selectedVariant,
+}: {
+  selectedSellingPlan: SellingPlanFragment;
+  selectedVariant: ProductFragment['selectedVariant'];
+}) {
+  if (!selectedVariant) {
+    return null;
+  }
+
+  const sellingPlanPriceAdjustments = selectedSellingPlan?.priceAdjustments;
+
+  if (!sellingPlanPriceAdjustments?.length) {
+    return selectedVariant ? <Money data={selectedVariant.price} /> : null;
+  }
+
+  const selectedVariantPrice: SellingPlanPrice = {
+    amount: parseFloat(selectedVariant.price.amount),
+    currencyCode: selectedVariant.price.currencyCode,
+  };
+
+  const sellingPlanPrice: SellingPlanPrice = sellingPlanPriceAdjustments.reduce(
+    (acc, adjustment) => {
+      switch (adjustment.adjustmentValue.__typename) {
+        case 'SellingPlanFixedAmountPriceAdjustment':
+          return {
+            amount:
+              acc.amount +
+              parseFloat(adjustment.adjustmentValue.adjustmentAmount.amount),
+            currencyCode: acc.currencyCode,
+          };
+        case 'SellingPlanFixedPriceAdjustment':
+          return {
+            amount: parseFloat(adjustment.adjustmentValue.price.amount),
+            currencyCode: acc.currencyCode,
+          };
+        case 'SellingPlanPercentagePriceAdjustment':
+          return {
+            amount:
+              acc.amount *
+              (1 - adjustment.adjustmentValue.adjustmentPercentage / 100),
+            currencyCode: acc.currencyCode,
+          };
+        default:
+          return acc;
+      }
+    },
+    selectedVariantPrice,
+  );
+
+  return (
+    <div className="selling-plan-price">
+      <Money
+        data={{
+          amount: `${sellingPlanPrice.amount}`,
+          currencyCode: sellingPlanPrice.currencyCode,
+        }}
+      />
+    </div>
+  );
+}
+
+// Update as you see fit to match your design and requirements
+function SellingPlanGroup({
+  sellingPlanGroup,
+}: {
+  sellingPlanGroup: SellingPlanGroup;
+}) {
+  return (
+    <div className="selling-plan-group" key={sellingPlanGroup.name}>
+      <p>
+        <strong>{sellingPlanGroup.name}:</strong>
+      </p>
+      {sellingPlanGroup.sellingPlans.nodes.map((sellingPlan) => {
+        return (
+          <Link
+            key={sellingPlan.id}
+            prefetch="intent"
+            to={sellingPlan.url}
+            className={`selling-plan ${
+              sellingPlan.isSelected ? 'selected' : 'unselected'
+            }`}
+            preventScrollReset
+            replace
+          >
+            <p>{sellingPlan.options.map((option) => `${option.value}`)}</p>
+          </Link>
+        );
+      })}
+    </div>
+  );
+}
+
+function ProductForm({
+  product,
+  selectedVariant,
+  variants,
+  selectedSellingPlan,
+  sellingPlanGroups,
+}: {
+  product: ProductFragment;
+  selectedVariant: ProductFragment['selectedVariant'];
+  variants: Array<ProductVariantFragment>;
+  selectedSellingPlan: SellingPlanFragment | null;
+  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
+}) {
+  const {open} = useAside();
+  const {publish, shop, cart, prevCart} = useAnalytics();
+
+  return (
+    <div className="product-form">
+      {sellingPlanGroups.nodes.length > 0 ? (
+        <>
+          {/* Add the SellingPlanSelector component inside the ProductForm */}
+          <SellingPlanSelector
+            sellingPlanGroups={sellingPlanGroups}
+            selectedSellingPlan={selectedSellingPlan}
+          >
+            {({sellingPlanGroup}) => (
+              /* Render the SellingPlanGroup component inside the SellingPlanSelector */
+              <SellingPlanGroup
+                key={sellingPlanGroup.name}
+                sellingPlanGroup={sellingPlanGroup}
+              />
+            )}
+          </SellingPlanSelector>
+        </>
+      ) : (
+        <VariantSelector
+          handle={product.handle}
+          options={product.options}
+          variants={variants}
+        >
+          {({option}) => <ProductOptions key={option.name} option={option} />}
+        </VariantSelector>
+      )}
+      <br />
+      <AddToCartButton
+        disabled={
+          !selectedVariant ||
+          !selectedVariant.availableForSale ||
+          (sellingPlanGroups.nodes.length > 0 && !selectedSellingPlan)
+        }
+        onClick={() => {
+          open('cart');
+          publish('cart_viewed', {
+            cart,
+            prevCart,
+            shop,
+            url: window.location.href || '',
+          } as CartViewPayload);
+        }}
+        lines={
+          selectedVariant
+            ? [
+                {
+                  merchandiseId: selectedVariant.id,
+                  quantity: 1,
+                  selectedVariant,
+                  sellingPlanId: selectedSellingPlan?.id,
+                },
+              ]
+            : []
+        }
+      >
+        {sellingPlanGroups.nodes.length > 0
+          ? selectedSellingPlan
+            ? 'Subscribe'
+            : 'Select a subscription'
+          : selectedVariant?.availableForSale
+          ? 'Add to cart'
+          : 'Sold out'}
+      </AddToCartButton>
+    </div>
+  );
+}
+
+function ProductOptions({option}: {option: VariantOption}) {
+  return (
+    <div className="product-options" key={option.name}>
+      <h5>{option.name}</h5>
+      <div className="product-options-grid">
+        {option.values.map(({value, isAvailable, isActive, to}) => {
+          return (
+            <Link
+              className="product-options-item"
+              key={option.name + value}
+              prefetch="intent"
+              preventScrollReset
+              replace
+              to={to}
+              style={{
+                border: isActive ? '1px solid black' : '1px solid transparent',
+                opacity: isAvailable ? 1 : 0.3,
+              }}
+            >
+              {value}
+            </Link>
+          );
+        })}
+      </div>
+      <br />
+    </div>
+  );
+}
+
+function AddToCartButton({
+  analytics,
+  children,
+  disabled,
+  lines,
+  onClick,
+}: {
+  analytics?: unknown;
+  children: React.ReactNode;
+  disabled?: boolean;
+  lines: Array<OptimisticCartLineInput>;
+  onClick?: () => void;
+}) {
+  return (
+    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
+      {(fetcher: FetcherWithComponents<any>) => (
+        <>
+          <input
+            name="analytics"
+            type="hidden"
+            value={JSON.stringify(analytics)}
+          />
+          <button
+            type="submit"
+            onClick={onClick}
+            disabled={disabled ?? fetcher.state !== 'idle'}
+          >
+            {children}
+          </button>
+        </>
+      )}
+    </CartForm>
+  );
+}
+
+// Add the SellingPlanGroup fragment to the Product fragment
+const SELLING_PLAN_FRAGMENT = `#graphql
+  fragment SellingPlanMoney on MoneyV2 {
+    amount
+    currencyCode
+  }
+  fragment SellingPlan on SellingPlan {
+    id
+    options {
+      name
+      value
+    }
+    priceAdjustments {
+      adjustmentValue {
+        ... on SellingPlanFixedAmountPriceAdjustment {
+          __typename
+          adjustmentAmount {
+            ... on MoneyV2 {
+               ...SellingPlanMoney
+            }
+          }
+        }
+        ... on SellingPlanFixedPriceAdjustment {
+          __typename
+          price {
+            ... on MoneyV2 {
+              ...SellingPlanMoney
+            }
+          }
+        }
+        ... on SellingPlanPercentagePriceAdjustment {
+          __typename
+          adjustmentPercentage
+        }
+      }
+      orderCount
+    }
+    recurringDeliveries
+    checkoutCharge {
+      type
+      value {
+        ... on MoneyV2 {
+          ...SellingPlanMoney
+        }
+        ... on SellingPlanCheckoutChargePercentageValue {
+          percentage
+        }
+      }
+    }
+ }
+` as const;
+
+// Add the SellingPlanGroup fragment to the Product fragment
+const SELLING_PLAN_GROUP_FRAGMENT = `#graphql
+  fragment SellingPlanGroup on SellingPlanGroup {
+    name
+    options {
+      name
+      values
+    }
+    sellingPlans(first:10) {
+      nodes {
+        ...SellingPlan
+      }
+    }
+  }
+  ${SELLING_PLAN_FRAGMENT}
+` as const;
+
 const PRODUCT_VARIANT_FRAGMENT = `#graphql
   fragment ProductVariant on ProductVariant {
     availableForSale
@@ -184,37 +655,31 @@ const PRODUCT_FRAGMENT = `#graphql
     handle
     descriptionHtml
     description
-    encodedVariantExistence
-    encodedVariantAvailability
     options {
       name
-      optionValues {
-        name
-        firstSelectableVariant {
-          ...ProductVariant
-        }
-        swatch {
-          color
-          image {
-            previewImage {
-              url
-            }
-          }
-        }
+      values
+    }
+    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+      ...ProductVariant
+    }
+    variants(first: 1) {
+      nodes {
+        ...ProductVariant
       }
     }
-    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
-      ...ProductVariant
-    }
-    adjacentVariants (selectedOptions: $selectedOptions) {
-      ...ProductVariant
-    }
     seo {
       description
       title
     }
+    # 9. Add the SellingPlanGroups fragment to the Product fragment
+    sellingPlanGroups(first:10) {
+      nodes {
+        ...SellingPlanGroup
+      }
+    }
   }
   ${PRODUCT_VARIANT_FRAGMENT}
+  ${SELLING_PLAN_GROUP_FRAGMENT}
 ` as const;
 
 const PRODUCT_QUERY = `#graphql
@@ -230,3 +695,27 @@ const PRODUCT_QUERY = `#graphql
   }
   ${PRODUCT_FRAGMENT}
 ` as const;
+
+const PRODUCT_VARIANTS_FRAGMENT = `#graphql
+  fragment ProductVariants on Product {
+    variants(first: 250) {
+      nodes {
+        ...ProductVariant
+      }
+    }
+  }
+  ${PRODUCT_VARIANT_FRAGMENT}
+` as const;
+
+const VARIANTS_QUERY = `#graphql
+  ${PRODUCT_VARIANTS_FRAGMENT}
+  query ProductVariants(
+    $country: CountryCode
+    $language: LanguageCode
+    $handle: String!
+  ) @inContext(country: $country, language: $language) {
+    product(handle: $handle) {
+      ...ProductVariants
+    }
+  }
+` as const;

```

</details>

## 🗑️ Deleted Files

- [`templates/skeleton/app/components/ProductForm.tsx`](templates/skeleton/app/components/ProductForm.tsx)