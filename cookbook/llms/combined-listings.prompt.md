# Overview

This prompt describes how to implement "Combined Listings" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Handle combined listings on product pages and in search results.

# User Intent Recognition

<user_queries>
- How can I show combined listings on product pages and search results using Hydrogen?
- How can I display the featured image of the combined listing parent product instead of the variant image?
- How can I redirect to the first variant of a combined listing when the handle is requested?
- How can I filter out combined listings from the product list when using Shopify headless?
- How can I show the price range for combined listings instead of the variant price?
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: Combined listings are being displayed in the product list.
  **Solution**: Make sure to tag combined listing parent products in the Shopify admin and use that tag to filter out combined listings from the product list in the GraphQL query.
</troubleshooting>

# Recipe Implementation

Here's the combined-listings recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

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

## New files added to the template by this recipe

- app/lib/combined-listings.ts

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

#### File: [combined-listings.ts](https://github.com/Shopify/hydrogen/blob/71a4a71c27faafe613e54557661cbaa7659b4935/cookbook/recipes/combined-listings/ingredients/templates/skeleton/app/lib/combined-listings.ts)

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

### Step 4: Update the ProductForm component

1. Update the `ProductForm` component to hide the **Add to cart** button for the parent products of combined listings and for variants' selected state.
2. Update the `Link` component to not replace the current URL when the product is a combined listing parent product.

#### File: /app/components/ProductForm.tsx

```diff
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

### Step 5: Extend the ProductImage component

Update the `ProductImage` component to support images from both product variants and the product itself.

#### File: /app/components/ProductImage.tsx

```diff
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

#### File: /app/components/ProductItem.tsx

```diff
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

#### File: /app/lib/redirect.ts

```diff
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

#### File: /app/routes/_index.tsx

```diff
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

### Step 9: (Optional) Filter out combined listings from collections pages

Since it's not possible to directly apply query filters when retrieving collection products, you can manually filter out combined listings after they're retrieved based on their tags.

#### File: /app/routes/collections.$handle.tsx

```diff
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

### Step 10: (Optional) Filter out combined listings from the collections index page

Update the `collections.all` route to filter out combined listings from the search results, and include the price range for combined listings.

#### File: /app/routes/collections.all.tsx

```diff
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

#### File: /app/routes/products.$handle.tsx

```diff
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

### Step 12: Update stylesheet

Add a class to the product item to show a range of prices for combined listings.

#### File: /app/styles/app.css

```diff
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

</recipe_implementation>