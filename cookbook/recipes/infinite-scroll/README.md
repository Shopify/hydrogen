# 🧑‍🍳 Infinite Scroll

This folder contains an example implementation of [infinite scroll](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#automatically-load-pages-on-scroll) within a product collection page using the [Pagination component](https://shopify.dev/docs/api/hydrogen/2024-07/components/pagination).

The example uses [`react-intersection-observer`](https://www.npmjs.com/package/react-intersection-observer) to detect when the `Load more` button is in view. A `useEffect` then triggers a navigation to the next page url, which seamlessly loads more products as the user scrolls.

A few side effects of this implementation are:

1. The page progressively enhances, so that when JavaScript has yet to load, the page is still interactive because the user can still click the `Load more` button.
2. As the user scrolls, the URL automatically changes as new pages are loaded.
3. Because the implementation uses the `Pagination` component, navigating back to the collection list after clicking on a product automatically maintains the user's scroll position.

## 🍣 Ingredients

| File | Description |
| --- | --- |

## 🍱 Steps

### 1. Edit the route loader

- Update the pageBy parameter passed to the getPaginationVariables function call to customize how many products to load at a time.
- Add a PreviousLink component that renders a link to the previous page.
- Add a NextLink component that renders a link to the next page.
- Add a ProductsGrid component that renders a grid of products.

#### File: [`app/routes/collections.$handle.tsx`](/templates/skeleton/app/routes/collections.$handle.tsx)

<details>

```diff
index a67d4643..7e948b55 100644
--- a/templates/skeleton/app/routes/collections.$handle.tsx
+++ b/templates/skeleton/app/routes/collections.$handle.tsx
@@ -1,14 +1,21 @@
 import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {useLoaderData, Link, type MetaFunction} from '@remix-run/react';
 import {
+  useLoaderData,
+  useNavigate,
+  Link,
+  type MetaFunction,
+} from '@remix-run/react';
+import {
+  Pagination,
   getPaginationVariables,
   Image,
   Money,
   Analytics,
 } from '@shopify/hydrogen';
 import type {ProductItemFragment} from 'storefrontapi.generated';
+import {useEffect} from 'react';
 import {useVariantUrl} from '~/lib/variants';
-import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
+import {useInView} from 'react-intersection-observer';
 
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [{title: `Hydrogen | ${data?.collection.title ?? ''} Collection`}];
@@ -36,6 +43,7 @@ async function loadCriticalData({
   const {handle} = params;
   const {storefront} = context;
   const paginationVariables = getPaginationVariables(request, {
+
     pageBy: 8,
   });
 
@@ -72,23 +80,44 @@ function loadDeferredData({context}: LoaderFunctionArgs) {
 
 export default function Collection() {
   const {collection} = useLoaderData<typeof loader>();
+  const {ref, inView} = useInView();
 
   return (
     <div className="collection">
       <h1>{collection.title}</h1>
       <p className="collection-description">{collection.description}</p>
-      <PaginatedResourceSection
-        connection={collection.products}
-        resourcesClassName="products-grid"
-      >
-        {({node: product, index}) => (
-          <ProductItem
-            key={product.id}
-            product={product}
-            loading={index < 8 ? 'eager' : undefined}
-          />
+      <Pagination connection={collection.products}>
+        {({
+          nodes,
+          isLoading,
+          PreviousLink,
+          NextLink,
+          state,
+          nextPageUrl,
+          hasNextPage,
+        }) => (
+          <>
+            {
+            <PreviousLink>
+              {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
+            </PreviousLink>
+            <ProductsGrid
+              products={nodes}
+              inView={inView}
+              hasNextPage={hasNextPage}
+              nextPageUrl={nextPageUrl}
+              state={state}
+            />
+            <br />
+            {
+            <NextLink ref={ref}>
+              <span ref={ref}>
+                {isLoading ? 'Loading...' : <span>Load more yeah ↓</span>}
+              </span>
+            </NextLink>
+          </>
         )}
-      </PaginatedResourceSection>
+      </Pagination>
       <Analytics.CollectionView
         data={{
           collection: {
@@ -101,6 +130,47 @@ export default function Collection() {
   );
 }
 
+
+function ProductsGrid({
+  products,
+  inView,
+  hasNextPage,
+  nextPageUrl,
+  state,
+}: {
+  products: ProductItemFragment[];
+  inView: boolean;
+  hasNextPage: boolean;
+  nextPageUrl: string;
+  state: any;
+}) {
+  const navigate = useNavigate();
+
+  useEffect(() => {
+    if (inView && hasNextPage) {
+      navigate(nextPageUrl, {
+        replace: true,
+        preventScrollReset: true,
+        state,
+      });
+    }
+  }, [inView, navigate, state, nextPageUrl, hasNextPage]);
+
+  return (
+    <div className="products-grid">
+      {products.map((product, index) => {
+        return (
+          <ProductItem
+            key={product.id}
+            product={product}
+            loading={index < 8 ? 'eager' : undefined}
+          />
+        );
+      })}
+    </div>
+  );
+}
+
 function ProductItem({
   product,
   loading,

```

</details>

### 2. package.json

Add the `react-intersection-observer` dependency.

#### File: [`package.json`](/templates/skeleton/package.json)

```diff
index d3638ae4..cabf51d9 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -22,7 +22,8 @@
     "graphql-tag": "^2.12.6",
     "isbot": "^5.1.21",
     "react": "^18.2.0",
-    "react-dom": "^18.2.0"
+    "react-dom": "^18.2.0",
+    "react-intersection-observer": "^8.32.0"
   },
   "devDependencies": {
     "@eslint/compat": "^1.2.5",

```