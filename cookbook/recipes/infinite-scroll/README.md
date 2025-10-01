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

### Step 1: README.md

Updates README with infinite scroll documentation and implementation details

#### File: [README.md](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/README.md)

<details>

~~~diff
index c584e537..6eacfd82 100644
--- a/templates/skeleton/README.md
+++ b/templates/skeleton/README.md
@@ -1,6 +1,8 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Infinite Scroll
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This Hydrogen template demonstrates infinite scroll pagination for collection pages. Hydrogen is Shopify's stack for headless commerce, designed to work with [Remix](https://remix.run/), Shopify's full stack web framework.
+
+This template shows how to implement a seamless browsing experience where products automatically load as users scroll down, replacing traditional pagination with continuous content loading.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -16,7 +18,28 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - Prettier
 - GraphQL generator
 - TypeScript and JavaScript flavors
-- Minimal setup of components and routes
+- **Infinite scroll pagination**
+- **Intersection Observer implementation**
+- **Optimized image loading strategies**
+
+## Infinite Scroll Features
+
+### Automatic Loading
+- Products load automatically when the "Load more" button enters the viewport
+- No manual clicking required for pagination
+- Smooth, uninterrupted browsing experience
+
+### Performance Optimizations
+- First 8 products load eagerly for instant display
+- Subsequent products use lazy loading
+- Images optimized with proper loading strategies
+- Minimal JavaScript overhead using native Intersection Observer
+
+### User Experience
+- Preserves browser history and URL state
+- Maintains scroll position during navigation
+- Clean URL updates using replace mode
+- No history cluttering from pagination
 
 ## Getting started
 
@@ -28,6 +51,25 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 npm create @shopify/hydrogen@latest
 ```
 
+## Implementation Details
+
+The infinite scroll implementation uses:
+- React's `useEffect` hook for scroll detection
+- Intersection Observer API for viewport detection
+- Remix's navigation for URL updates
+- Shopify's Pagination component as the base
+
+### Key Components
+
+```tsx
+// Intersection Observer setup
+useEffect(() => {
+  if (!fetcher.data && !fetcher.state) {
+    fetcher.load(nextPageUrl);
+  }
+}, [inView]);
+```
+
 ## Building for production
 
 ```bash
@@ -40,6 +82,14 @@ npm run build
 npm run dev
 ```
 
+## Customization
+
+You can adjust the infinite scroll behavior by:
+- Changing the threshold for when loading triggers
+- Modifying the number of products loaded per batch
+- Customizing the loading indicator
+- Adding scroll-to-top functionality
+
 ## Setup for using Customer Account API (`/account` section)
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
\ No newline at end of file
~~~

</details>

### Step 2: app/routes/collections.$handle.tsx



#### File: [app/routes/collections.$handle.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/app/routes/collections.$handle.tsx)

<details>

~~~diff
index c416c2b3..e6a35150 100644
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
~~~

</details>

### Step 3: package.json



#### File: [package.json](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/templates/skeleton/package.json)

~~~diff
index e9ebd1d3..e51634ee 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -20,6 +20,7 @@
     "isbot": "^5.1.22",
     "react": "18.3.1",
     "react-dom": "18.3.1",
+    "react-intersection-observer": "^8.34.0",
     "react-router": "7.9.2",
     "react-router-dom": "7.9.2"
   },
~~~