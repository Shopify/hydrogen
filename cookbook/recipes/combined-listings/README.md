# Combined Listings


This recipe handles Shopify combined listings in product pages and search results.
Behavior for combined listings is customized by the `combinedListingsSettings` object in `app/lib/combined-listings.ts`.

**Available options:**
- `redirectToFirstVariant`: Redirect to the first variant of a combined
  listing when the handle is requested.

- `combinedListingTag`: The tag that indicates a combined listing.
- `hideCombinedListingsFromProductList`: Hide combined listings from the
  product list.


> [!NOTE]
> Combined listings are available only to stores on a [Shopify Plus](https://www.shopify.com/plus) plan.

## Requirements

- Install the [Combined Listings app](https://admin.shopify.com/apps/combined-listings) in your store.
- Add a tag to any combined listing parent products to indicate they're a combined listing, for example `combined`.


## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [`app/lib/combined-listings.ts`](ingredients/templates/skeleton/app/lib/combined-listings.ts) | Utilities and settings for handling combined listings. |

## Steps

### Step 1: Add ingredients to your project

Copy all the files found in the `ingredients/` directory to the current directory.

- [`app/lib/combined-listings.ts`](ingredients/templates/skeleton/app/lib/combined-listings.ts)

### Step 2: app/components/ProductForm.tsx

Update the `ProductForm` component to hide the add to cart button for combined listings parent products, as well as the selected state for variants.


#### File: [`app/components/ProductForm.tsx`](/templates/skeleton/app/components/ProductForm.tsx)

<details>

```diff
index e8616a61..838a903a 100644
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
@@ -53,9 +55,10 @@ export function ProductForm({
                       replace
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

### Step 3: app/components/ProductImage.tsx

Update the `ProductImage` component to support images from both product variants and the product itself.


#### File: [`app/components/ProductImage.tsx`](/templates/skeleton/app/components/ProductImage.tsx)

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

### Step 4: app/components/ProductItem.tsx

Show a range of prices for combined listings.


#### File: [`app/components/ProductItem.tsx`](/templates/skeleton/app/components/ProductItem.tsx)

```diff
index 62c64b50..034b5660 100644
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

### Step 5: app/lib/redirect.ts

Add a utility to redirect to the first variant of a combined listing when the handle is requested.


#### File: [`app/lib/redirect.ts`](/templates/skeleton/app/lib/redirect.ts)

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

### Step 6: app/routes/_index.tsx

Update the index route to filter out combined listings from the search results, and include the price range for combined listings.


#### File: [`app/routes/_index.tsx`](/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 34747528..6e485083 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,13 +1,13 @@
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {Await, useLoaderData, Link, type MetaFunction} from '@remix-run/react';
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

### Step 7: app/routes/collections.$handle.tsx

Manually filter out combined listings from the collection products.


#### File: [`app/routes/collections.$handle.tsx`](/templates/skeleton/app/routes/collections.$handle.tsx)

<details>

```diff
index f1d7fa3e..17edfb7d 100644
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

### Step 8: app/routes/collections.all.tsx

Update the `collections.all` route to filter out combined listings from the search results, and include the price range for combined listings.


#### File: [`app/routes/collections.all.tsx`](/templates/skeleton/app/routes/collections.all.tsx)

```diff
index 3a31b2f7..c756c9e1 100644
--- a/templates/skeleton/app/routes/collections.all.tsx
+++ b/templates/skeleton/app/routes/collections.all.tsx
@@ -3,7 +3,10 @@ import {useLoaderData, type MetaFunction} from '@remix-run/react';
 import {getPaginationVariables} from '@shopify/hydrogen';
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

### Step 9: app/routes/products.$handle.tsx

- Redirect to the first variant of a combined listing when the handle is requested
- Display a range of prices for combined listings
- Show the featured image of the combined listing parent product


#### File: [`app/routes/products.$handle.tsx`](/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 2dc6bda2..8baafac9 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,4 +1,4 @@
-import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {useLoaderData, type MetaFunction} from '@remix-run/react';
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

### Step 10: app/styles/app.css

Add a class to the product item to show a range of prices for combined listings.


#### File: [`app/styles/app.css`](/templates/skeleton/app/styles/app.css)

```diff
index b9294c59..0b5edfe4 100644
--- a/templates/skeleton/app/styles/app.css
+++ b/templates/skeleton/app/styles/app.css
@@ -210,7 +210,6 @@ button.reset:hover:not(:has(> *)) {
   min-width: fit-content;
 }
 
-
 /*
 * --------------------------------------------------
 * components/Footer
@@ -419,6 +418,11 @@ button.reset:hover:not(:has(> *)) {
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