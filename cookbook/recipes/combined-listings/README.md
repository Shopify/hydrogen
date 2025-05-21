# Combined Listings

This recipe lets you more precisely display and manage [combined listings](https://help.shopify.com/en/manual/products/combined-listings-app) on product pages and in search results for your Hydrogen storefront. A combined listing groups separate products together into a single product listing using a shared option like color or size.
Each product appears as a variant but can have its own title, description, URL, and images.
In this recipe, you'll make the following changes:

1. Set up the Combined Listings app in your Shopify admin and group relevant products together as combined listings.
2. Configure how combined listings will be handled on your storefront.
3. Update the `ProductForm` component to hide the **Add to cart** button for the parent products of combined listings.
4. Update the `ProductImage` component to support images from product variants and the product itself.
5. Show a range of prices for combined listings in `ProductItem`.

## Requirements

- Your store must be on either a [Shopify Plus](https://www.shopify.com/plus) or enterprise plan.
- Your store must have the [Combined Listings app](https://admin.shopify.com/apps/combined-listings) installed.

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/lib/combined-listings.ts](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/cookbook/recipes/combined-listings/ingredients/templates/skeleton/app/lib/combined-listings.ts) | The `combined-listings.ts` file contains utilities and settings for handling combined listings. |

## Steps

### Step 1: Set up the Combined Listings app

1. Install the [Combined Listings app](https://admin.shopify.com/apps/combined-listings).

2. [Create combined listing products in your store](https://help.shopify.com/en/manual/products/combined-listings-app#creating-a-combined-listing).

3. Add tags to the parent products of combined listings to indicate that they're part of a combined listing (for example `combined`).

### Step 2: Configure combined listings behavior

You can customize how the parent products of combined listings are retrieved and displayed.

To make this process easier, we included a configuration object in the `combined-listings.ts` file that you can edit to customize according to your preferences.

```ts
// Edit these values to customize the combined listings behaviors
export const combinedListingsSettings = {
  // If true, loading the product page will redirect to the first variant
  redirectToFirstVariant: false,
  // The tag that indicates a combined listing
  combinedListingTag: 'combined',
  // If true, combined listings will not be shown in the product list
  hideCombinedListingsFromProductList: true,
};
```

### Step 3: Add combined listings utilities

Create a new `combined-listings.ts` file that contains utilities and settings for handling combined listings.

#### File: [combined-listings.ts](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/cookbook/recipes/combined-listings/ingredients/templates/skeleton/app/lib/combined-listings.ts)

<details>

```ts
// Edit these values to customize combined listings' behavior
export const combinedListingsSettings = {
  // If true, loading the product page will redirect to the first variant
  redirectToFirstVariant: false,
  // The tag that indicates a combined listing
  combinedListingTag: 'combined',
  // If true, combined listings will not be shown in the product list
  hideCombinedListingsFromProductList: true,
};

export const maybeFilterOutCombinedListingsQuery =
  combinedListingsSettings.hideCombinedListingsFromProductList
    ? `NOT tag:${combinedListingsSettings.combinedListingTag}`
    : '';

interface ProductWithTags {
  tags: string[];
}

function isProductWithTags(u: unknown): u is ProductWithTags {
  const maybe = u as ProductWithTags;
  return (
    u != null &&
    typeof u === 'object' &&
    'tags' in maybe &&
    Array.isArray(maybe.tags)
  );
}

export function isCombinedListing(product: unknown) {
  return (
    isProductWithTags(product) &&
    product.tags.includes(combinedListingsSettings.combinedListingTag)
  );
}

```

</details>

### Step 4: Update the ProductForm component

1. Update the `ProductForm` component to hide the **Add to cart** button for the parent products of combined listings and for variants' selected state.
2. Update the `Link` component to not replace the current URL when the product is a combined listing parent product.

#### File: [app/components/ProductForm.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/components/ProductForm.tsx)

<details>

```diff
index 61290120..e7dbc4d1 100644
--- a/templates/skeleton/app/components/ProductForm.tsx
+++ b/templates/skeleton/app/components/ProductForm.tsx
@@ -11,9 +11,11 @@ import type {ProductFragment} from 'storefrontapi.generated';
 export function ProductForm({
   productOptions,
   selectedVariant,
+  combinedListing,
 }: {
   productOptions: MappedProductOptions[];
   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
+  combinedListing: boolean;
 }) {
   const navigate = useNavigate();
   const {open} = useAside();
@@ -50,12 +52,13 @@ export function ProductForm({
                       key={option.name + name}
                       prefetch="intent"
                       preventScrollReset
-                      replace
+                      replace={!combinedListing}
                       to={`/products/${handle}?${variantUriQuery}`}
                       style={{
-                        border: selected
-                          ? '1px solid black'
-                          : '1px solid transparent',
+                        border:
+                          selected && !combinedListing
+                            ? '1px solid black'
+                            : '1px solid transparent',
                         opacity: available ? 1 : 0.3,
                       }}
                     >
@@ -76,9 +79,10 @@ export function ProductForm({
                       }`}
                       key={option.name + name}
                       style={{
-                        border: selected
-                          ? '1px solid black'
-                          : '1px solid transparent',
+                        border:
+                          selected && !combinedListing
+                            ? '1px solid black'
+                            : '1px solid transparent',
                         opacity: available ? 1 : 0.3,
                       }}
                       disabled={!exists}
@@ -101,25 +105,27 @@ export function ProductForm({
           </div>
         );
       })}
-      <AddToCartButton
-        disabled={!selectedVariant || !selectedVariant.availableForSale}
-        onClick={() => {
-          open('cart');
-        }}
-        lines={
-          selectedVariant
-            ? [
-                {
-                  merchandiseId: selectedVariant.id,
-                  quantity: 1,
-                  selectedVariant,
-                },
-              ]
-            : []
-        }
-      >
-        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
-      </AddToCartButton>
+      {!combinedListing && (
+        <AddToCartButton
+          disabled={!selectedVariant || !selectedVariant.availableForSale}
+          onClick={() => {
+            open('cart');
+          }}
+          lines={
+            selectedVariant
+              ? [
+                  {
+                    merchandiseId: selectedVariant.id,
+                    quantity: 1,
+                    selectedVariant,
+                  },
+                ]
+              : []
+          }
+        >
+          {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
+        </AddToCartButton>
+      )}
     </div>
   );
 }
```

</details>

### Step 5: Extend the ProductImage component

Update the `ProductImage` component to support images from both product variants and the product itself.

#### File: [app/components/ProductImage.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/components/ProductImage.tsx)

```diff
index 5f3ac1cc..f1c9f2cd 100644
--- a/templates/skeleton/app/components/ProductImage.tsx
+++ b/templates/skeleton/app/components/ProductImage.tsx
@@ -1,10 +1,13 @@
-import type {ProductVariantFragment} from 'storefrontapi.generated';
+import type {
+  ProductVariantFragment,
+  ProductFragment,
+} from 'storefrontapi.generated';
 import {Image} from '@shopify/hydrogen';
 
 export function ProductImage({
   image,
 }: {
-  image: ProductVariantFragment['image'];
+  image: ProductVariantFragment['image'] | ProductFragment['featuredImage'];
 }) {
   if (!image) {
     return <div className="product-image" />;
```

### Step 6: Show a range of prices for combined listings in ProductItem

Update `ProductItem.tsx` to show a range of prices for the combined listing parent product instead of the variant price.

#### File: [app/components/ProductItem.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/components/ProductItem.tsx)

```diff
index 3b0f6913..07fc73cd 100644
--- a/templates/skeleton/app/components/ProductItem.tsx
+++ b/templates/skeleton/app/components/ProductItem.tsx
@@ -6,6 +6,7 @@ import type {
   RecommendedProductFragment,
 } from 'storefrontapi.generated';
 import {useVariantUrl} from '~/lib/variants';
+import {isCombinedListing} from '../lib/combined-listings';
 
 export function ProductItem({
   product,
@@ -36,9 +37,17 @@ export function ProductItem({
         />
       )}
       <h4>{product.title}</h4>
-      <small>
-        <Money data={product.priceRange.minVariantPrice} />
-      </small>
+      {isCombinedListing(product) ? (
+        <small className="combined-listing-price">
+          <Money data={product.priceRange.minVariantPrice} />
+          <span>–</span>
+          <Money data={product.priceRange.maxVariantPrice} />
+        </small>
+      ) : (
+        <small>
+          <Money data={product.priceRange.minVariantPrice} />
+        </small>
+      )}
     </Link>
   );
 }
```

### Step 7: (Optional) Add redirect utility to first variant of a combined listing

If you want to redirect automatically to the first variant of a combined listing when the parent handle is selected, add a redirect utility that's called whenever the parent handle is requested.

#### File: [app/lib/redirect.ts](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/lib/redirect.ts)

```diff
index ce1feb5a..29fe2ecc 100644
--- a/templates/skeleton/app/lib/redirect.ts
+++ b/templates/skeleton/app/lib/redirect.ts
@@ -1,4 +1,6 @@
 import {redirect} from '@shopify/remix-oxygen';
+import {ProductFragment} from 'storefrontapi.generated';
+import {isCombinedListing} from './combined-listings';
 
 export function redirectIfHandleIsLocalized(
   request: Request,
@@ -21,3 +23,23 @@ export function redirectIfHandleIsLocalized(
     throw redirect(url.toString());
   }
 }
+
+export function redirectIfCombinedListing(
+  request: Request,
+  product: ProductFragment,
+) {
+  const url = new URL(request.url);
+  let shouldRedirect = false;
+
+  if (isCombinedListing(product)) {
+    url.pathname = url.pathname.replace(
+      product.handle,
+      product.selectedOrFirstAvailableVariant?.product.handle ?? '',
+    );
+    shouldRedirect = true;
+  }
+
+  if (shouldRedirect) {
+    throw redirect(url.toString());
+  }
+}
```

### Step 8: Update queries for combined listings

1. Add the `tags` property to the items returned by the product query.
2. (Optional) Add the filtering query to the product query to exclude combined listings.

#### File: [app/routes/_index.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 543e76be..1e75522b 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,13 +1,13 @@
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import { Await, useLoaderData, Link, type MetaFunction } from 'react-router';
 import {Suspense} from 'react';
-import {Image, Money} from '@shopify/hydrogen';
+import {Image} from '@shopify/hydrogen';
 import type {
   FeaturedCollectionFragment,
   RecommendedProductsQuery,
 } from 'storefrontapi.generated';
 import {ProductItem} from '~/components/ProductItem';
-
+import {maybeFilterOutCombinedListingsQuery} from '~/lib/combined-listings';
 export const meta: MetaFunction = () => {
   return [{title: 'Hydrogen | Home'}];
 };
@@ -44,7 +44,11 @@ async function loadCriticalData({context}: LoaderFunctionArgs) {
  */
 function loadDeferredData({context}: LoaderFunctionArgs) {
   const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
+    .query(RECOMMENDED_PRODUCTS_QUERY, {
+      variables: {
+        query: maybeFilterOutCombinedListingsQuery,
+      },
+    })
     .catch((error) => {
       // Log query errors, but don't throw them so the page can still render
       console.error(error);
@@ -100,11 +104,9 @@ function RecommendedProducts({
         <Await resolve={products}>
           {(response) => (
             <div className="recommended-products-grid">
-              {response
-                ? response.products.nodes.map((product) => (
-                    <ProductItem key={product.id} product={product} />
-                  ))
-                : null}
+              {response?.products.nodes.map((product) => (
+                <ProductItem key={product.id} product={product} />
+              ))}
             </div>
           )}
         </Await>
@@ -147,7 +149,12 @@ const RECOMMENDED_PRODUCTS_QUERY = `#graphql
         amount
         currencyCode
       }
+      maxVariantPrice {
+        amount
+        currencyCode
+      }
     }
+    tags
     featuredImage {
       id
       url
@@ -156,9 +163,9 @@ const RECOMMENDED_PRODUCTS_QUERY = `#graphql
       height
     }
   }
-  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
+  query RecommendedProducts ($country: CountryCode, $language: LanguageCode, $query: String)
     @inContext(country: $country, language: $language) {
-    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
+    products(first: 4, sortKey: UPDATED_AT, reverse: true, query: $query) {
       nodes {
         ...RecommendedProduct
       }
```

</details>

### Step 9: (Optional) Filter out combined listings from collections pages

Since it's not possible to directly apply query filters when retrieving collection products, you can manually filter out combined listings after they're retrieved based on their tags.

#### File: [app/routes/collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/routes/collections.$handle.tsx)

<details>

```diff
index b44bc1ba..fb04d67f 100644
--- a/templates/skeleton/app/routes/collections.$handle.tsx
+++ b/templates/skeleton/app/routes/collections.$handle.tsx
@@ -4,7 +4,10 @@ import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
 import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
 import {redirectIfHandleIsLocalized} from '~/lib/redirect';
 import {ProductItem} from '~/components/ProductItem';
-
+import {
+  combinedListingsSettings,
+  isCombinedListing,
+} from '~/lib/combined-listings';
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [{title: `Hydrogen | ${data?.collection.title ?? ''} Collection`}];
 };
@@ -71,12 +74,25 @@ function loadDeferredData({context}: LoaderFunctionArgs) {
 export default function Collection() {
   const {collection} = useLoaderData<typeof loader>();
 
+  // Manually filter out combined listings from the collection products, because filtering
+  // would not work here.
+  const filteredCollectionProducts = {
+    ...collection.products,
+    nodes: collection.products.nodes.filter(
+      (product) =>
+        !(
+          combinedListingsSettings.hideCombinedListingsFromProductList &&
+          isCombinedListing(product)
+        ),
+    ),
+  };
+
   return (
     <div className="collection">
       <h1>{collection.title}</h1>
       <p className="collection-description">{collection.description}</p>
       <PaginatedResourceSection
-        connection={collection.products}
+        connection={filteredCollectionProducts}
         resourcesClassName="products-grid"
       >
         {({node: product, index}) => (
@@ -108,6 +124,7 @@ const PRODUCT_ITEM_FRAGMENT = `#graphql
     id
     handle
     title
+    tags
     featuredImage {
       id
       altText
@@ -147,7 +164,7 @@ const COLLECTION_QUERY = `#graphql
         first: $first,
         last: $last,
         before: $startCursor,
-        after: $endCursor
+        after: $endCursor,
       ) {
         nodes {
           ...ProductItem
```

</details>

### Step 10: (Optional) Filter out combined listings from the collections index page

Update the `collections.all` route to filter out combined listings from the search results, and include the price range for combined listings.

#### File: [app/routes/collections.all.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/routes/collections.all.tsx)

```diff
index b9d0f33f..d1688772 100644
--- a/templates/skeleton/app/routes/collections.all.tsx
+++ b/templates/skeleton/app/routes/collections.all.tsx
@@ -3,7 +3,10 @@ import {useLoaderData, type MetaFunction} from 'react-router';
 import {getPaginationVariables, Image, Money} from '@shopify/hydrogen';
 import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
 import {ProductItem} from '~/components/ProductItem';
-
+import {
+  combinedListingsSettings,
+  maybeFilterOutCombinedListingsQuery,
+} from '../lib/combined-listings';
 export const meta: MetaFunction<typeof loader> = () => {
   return [{title: `Hydrogen | Products`}];
 };
@@ -30,7 +33,12 @@ async function loadCriticalData({context, request}: LoaderFunctionArgs) {
 
   const [{products}] = await Promise.all([
     storefront.query(CATALOG_QUERY, {
-      variables: {...paginationVariables},
+      variables: {
+        ...paginationVariables,
+        query: combinedListingsSettings.hideCombinedListingsFromProductList
+          ? maybeFilterOutCombinedListingsQuery
+          : '',
+      },
     }),
     // Add other queries here, so that they are loaded in parallel
   ]);
@@ -77,6 +85,7 @@ const COLLECTION_ITEM_FRAGMENT = `#graphql
     id
     handle
     title
+    tags
     featuredImage {
       id
       altText
@@ -104,8 +113,9 @@ const CATALOG_QUERY = `#graphql
     $last: Int
     $startCursor: String
     $endCursor: String
+    $query: String
   ) @inContext(country: $country, language: $language) {
-    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
+    products(first: $first, last: $last, before: $startCursor, after: $endCursor, query: $query) {
       nodes {
         ...CollectionItem
       }
```

### Step 11: Update the product page

1. Display a range of prices for combined listings instead of the variant price.
2. Show the featured image of the combined listing parent product instead of the variant image.
3. (Optional) Redirect to the first variant of a combined listing when the handle is requested.

#### File: [app/routes/products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 4989ca00..e087fb10 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,4 +1,4 @@
-import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import { useLoaderData, type MetaFunction } from 'react-router';
 import {
   getSelectedProductOptions,
@@ -11,7 +11,14 @@ import {
 import {ProductPrice} from '~/components/ProductPrice';
 import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
-import {redirectIfHandleIsLocalized} from '~/lib/redirect';
+import {
+  redirectIfCombinedListing,
+  redirectIfHandleIsLocalized,
+} from '~/lib/redirect';
+import {
+  isCombinedListing,
+  combinedListingsSettings,
+} from '../lib/combined-listings';
 
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [
@@ -63,6 +70,10 @@ async function loadCriticalData({
   // The API handle might be localized, so redirect to the localized handle
   redirectIfHandleIsLocalized(request, {handle, data: product});
 
+  if (combinedListingsSettings.redirectToFirstVariant) {
+    redirectIfCombinedListing(request, product);
+  }
+
   return {
     product,
   };
@@ -82,6 +93,7 @@ function loadDeferredData({context, params}: LoaderFunctionArgs) {
 
 export default function Product() {
   const {product} = useLoaderData<typeof loader>();
+  const combinedListing = isCombinedListing(product);
 
   // Optimistically selects a variant with given available variant information
   const selectedVariant = useOptimisticVariant(
@@ -91,7 +103,9 @@ export default function Product() {
 
   // Sets the search param to the selected variant without navigation
   // only when no search params are set in the url
-  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
+  useSelectedOptionInUrlParam(
+    combinedListing ? [] : selectedVariant.selectedOptions,
+  );
 
   // Get the product options array
   const productOptions = getProductOptions({
@@ -99,21 +113,41 @@ export default function Product() {
     selectedOrFirstAvailableVariant: selectedVariant,
   });
 
-  const {title, descriptionHtml} = product;
+  const {descriptionHtml, title} = product;
+
+  const productImage = combinedListing
+    ? (product.featuredImage ?? selectedVariant?.image)
+    : selectedVariant?.image;
 
   return (
     <div className="product">
-      <ProductImage image={selectedVariant?.image} />
+      <ProductImage image={productImage} />
       <div className="product-main">
         <h1>{title}</h1>
-        <ProductPrice
-          price={selectedVariant?.price}
-          compareAtPrice={selectedVariant?.compareAtPrice}
-        />
+        {combinedListing ? (
+          <div>
+            <div style={{display: 'flex', gap: '10px'}}>
+              <span style={{display: 'flex', gap: '5px'}}>
+                From
+                <ProductPrice price={product.priceRange.minVariantPrice} />
+              </span>
+              <span style={{display: 'flex', gap: '5px'}}>
+                To
+                <ProductPrice price={product.priceRange.maxVariantPrice} />
+              </span>
+            </div>
+          </div>
+        ) : (
+          <ProductPrice
+            price={selectedVariant?.price}
+            compareAtPrice={selectedVariant?.compareAtPrice}
+          />
+        )}
         <br />
         <ProductForm
+          combinedListing={combinedListing}
           productOptions={productOptions}
-          selectedVariant={selectedVariant}
+          selectedVariant={combinedListing ? selectedVariant : undefined}
         />
         <br />
         <br />
@@ -190,6 +224,22 @@ const PRODUCT_FRAGMENT = `#graphql
     description
     encodedVariantExistence
     encodedVariantAvailability
+    tags
+    featuredImage {
+      id
+      url
+      altText
+    }
+    priceRange {
+      minVariantPrice {
+        amount
+        currencyCode
+      }
+      maxVariantPrice {
+        amount
+        currencyCode
+      }
+    }
     options {
       name
       optionValues {
```

</details>

### Step 12: Update stylesheet

Add a class to the product item to show a range of prices for combined listings.

#### File: [app/styles/app.css](https://github.com/Shopify/hydrogen/blob/2e32e77efa32aca00b18552fbdbfcb8af012f4ca/templates/skeleton/app/styles/app.css)

```diff
index b9294c59..c8fa5109 100644
--- a/templates/skeleton/app/styles/app.css
+++ b/templates/skeleton/app/styles/app.css
@@ -419,6 +419,11 @@ button.reset:hover:not(:has(> *)) {
   width: 100%;
 }
 
+.product-item .combined-listing-price {
+  display: flex;
+  grid-gap: 0.5rem;
+}
+
 /*
 * --------------------------------------------------
 * routes/products.$handle.tsx
```

## Next steps

- Test your implementation by going to your store and searching for a combined listing. Make sure that the combined listing's details appear in the search results and on the product page.
- (Optional) [Place a test order](https://help.shopify.com/en/manual/checkout-settings/test-orders) to see how orders for combined listings appear in your Shopify admin.