# Infinite Scroll for Collections

Implements infinite scroll functionality on collection pages using intersection observer.
Products automatically load as users scroll down, replacing traditional pagination buttons
with a smooth, continuous browsing experience.

Key features:
- Automatic loading when "Load more" button comes into view
- Preserves browser history and URL state
- Maintains scroll position during navigation
- Optimized loading with eager/lazy image loading

> [!NOTE]
> The intersection observer triggers when the "Load more" button enters the viewport

> [!NOTE]
> Navigation updates use replace mode to avoid cluttering browser history

> [!NOTE]
> First 8 products load eagerly for faster initial render

> [!NOTE]
> Subsequent products use lazy loading to optimize performance

## Requirements

- Basic understanding of React hooks (useEffect, custom hooks)
- Familiarity with Shopify's Pagination component
- Knowledge of intersection observer API concepts

## Steps

### Step 1: app/routes/collections.$handle.tsx



#### File: [app/routes/collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/app/routes/collections.$handle.tsx)

<details>

```diff
index c416c2b3d..e6a351500 100644
--- a/templates/skeleton/app/routes/collections.$handle.tsx
+++ b/templates/skeleton/app/routes/collections.$handle.tsx
@@ -1,9 +1,14 @@
-import {redirect, useLoaderData} from 'react-router';
+import {redirect, useLoaderData, useNavigate} from 'react-router';
 import type {Route} from './+types/collections.$handle';
-import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
-import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
+import {
+  getPaginationVariables,
+  Analytics,
+  Pagination,
+} from '@shopify/hydrogen';
 import {redirectIfHandleIsLocalized} from '~/lib/redirect';
 import {ProductItem} from '~/components/ProductItem';
+import {useEffect} from 'react';
+import {useInView} from 'react-intersection-observer';
 import type {ProductItemFragment} from 'storefrontapi.generated';
 
 export const meta: Route.MetaFunction = ({data}) => {
@@ -67,23 +72,41 @@ function loadDeferredData({context}: Route.LoaderArgs) {
 
 export default function Collection() {
   const {collection} = useLoaderData<typeof loader>();
+  const {ref, inView} = useInView();
 
   return (
     <div className="collection">
       <h1>{collection.title}</h1>
       <p className="collection-description">{collection.description}</p>
-      <PaginatedResourceSection<ProductItemFragment>
-        connection={collection.products}
-        resourcesClassName="products-grid"
-      >
-        {({node: product, index}) => (
-          <ProductItem
-            key={product.id}
-            product={product}
-            loading={index < 8 ? 'eager' : undefined}
-          />
+      <Pagination<ProductItemFragment> connection={collection.products}>
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
+            {/* @description Add ref to NextLink for intersection observer */}
+            <NextLink ref={ref}>
+              {isLoading ? 'Loading...' : <span>Load more ↓</span>}
+            </NextLink>
+          </>
         )}
-      </PaginatedResourceSection>
+      </Pagination>
       <Analytics.CollectionView
         data={{
           collection: {
@@ -96,6 +119,47 @@ export default function Collection() {
   );
 }
 
+// @description ProductsGrid component with infinite scroll functionality
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
+      void navigate(nextPageUrl, {
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
 const PRODUCT_ITEM_FRAGMENT = `#graphql
   fragment MoneyProductItem on MoneyV2 {
     amount
```

</details>

### Step 2: package.json



#### File: [package.json](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/package.json)

```diff
index 0ee1599a1..7b212aa62 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -20,6 +20,7 @@
     "isbot": "^5.1.22",
     "react": "18.3.1",
     "react-dom": "18.3.1",
+    "react-intersection-observer": "^8.34.0",
     "react-router": "7.9.1",
     "react-router-dom": "7.9.1"
   },
```