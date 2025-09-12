# Overview

This prompt describes how to implement "infinite-scroll" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary



# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the infinite-scroll recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description



## New files added to the template by this recipe



## Steps

### Step 1: app/routes/collections.$handle.tsx



#### File: /app/routes/collections.$handle.tsx

```diff
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

### Step 2: package.json



#### File: /package.json

```diff
@@ -20,6 +20,7 @@
     "isbot": "^5.1.22",
     "react": "18.3.1",
     "react-dom": "18.3.1",
+    "react-intersection-observer": "^8.34.0",
     "react-router": "7.8.2",
     "react-router-dom": "7.8.2"
   },
```

</recipe_implementation>