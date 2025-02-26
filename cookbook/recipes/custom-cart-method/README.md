# 🧑‍🍳 Custom Cart Method

This is an example of implementation of how to edit product option in cart. It does this by creating an [custom method](https://shopify.dev/docs/api/hydrogen/2023-10/utilities/createcarthandler#example-custom-methods) named `updateLineByOptions` for cart.

This method takes a product Id, currently selected options, and query for the `merchandiseId` needed to make an cart line item update.

It also showcase an end-to-end implementation of [custom method](https://shopify.dev/docs/api/hydrogen/2023-10/utilities/createcarthandler#example-custom-methods) including the additional handler for `CustomUpdateLineByOptions` action (all custom method action should be prefix with `Custom`) in cart route, and the UI that trigger the handler.



> [!NOTE]
> This is an isolated example, for a better edit in cart user experience we recommend implementing an optimistic cart along side of this example.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/Cart.tsx`](ingredients/templates/skeleton/app/components/Cart.tsx) | The custom Cart component. |

## 🍱 Steps

### 1. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/Cart.tsx`

### 2. app/lib/context.ts

Add the custom cart methods.

#### File: [`app/lib/context.ts`](/templates/skeleton/app/lib/context.ts)

<details>

```diff
index c424c511..ffb17487 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,6 +1,14 @@
-import {createHydrogenContext} from '@shopify/hydrogen';
+import {
+  createHydrogenContext,
+  cartLinesUpdateDefault,
+  cartGetIdDefault,
+} from '@shopify/hydrogen';
 import {AppSession} from '~/lib/session';
-import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
+import {CART_QUERY_FRAGMENT, PRODUCT_VARIANT_QUERY} from '~/lib/fragments';
+import type {
+  SelectedOptionInput,
+  CartLineUpdateInput,
+} from '@shopify/hydrogen/storefront-api-types';
 
 /**
  * The context implementation is separate from server.ts
@@ -33,6 +41,36 @@ export async function createAppLoadContext(
     i18n: {language: 'EN', country: 'US'},
     cart: {
       queryFragment: CART_QUERY_FRAGMENT,
+
+      // Avoid using method definition in customMethods ie. methodDefinition() {}
+      // as TypeScript is unable to correctly infer the type
+      // if method definition is necessary, declaring customMethods separately
+      customMethods: {
+        updateLineByOptions: async (
+          productId: string,
+          selectedOptions: SelectedOptionInput[],
+          line: CartLineUpdateInput,
+        ) => {
+          const {product} = await hydrogenContext.storefront.query(
+            PRODUCT_VARIANT_QUERY,
+            {
+              variables: {
+                productId,
+                selectedOptions,
+              },
+            },
+          );
+
+          const lines = [
+            {...line, merchandiseId: product?.selectedVariant?.id},
+          ];
+
+          return await cartLinesUpdateDefault({
+            storefront: hydrogenContext.storefront,
+            getCartId: cartGetIdDefault(request.headers),
+          })(lines);
+        },
+      },
     },
   });
 

```

</details>

### 3. app/lib/fragments.ts

Query to get the variant by selected options.

#### File: [`app/lib/fragments.ts`](/templates/skeleton/app/lib/fragments.ts)

<details>

```diff
index dc4426a9..b8aad66f 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -47,56 +47,10 @@ export const CART_QUERY_FRAGMENT = `#graphql
           title
           id
           vendor
-        }
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
-  }
-  fragment CartLineComponent on ComponentizableCartLine {
-    id
-    quantity
-    attributes {
-      key
-      value
-    }
-    cost {
-      totalAmount {
-        ...Money
-      }
-      amountPerQuantity {
-        ...Money
-      }
-      compareAtAmountPerQuantity {
-        ...Money
-      }
-    }
-    merchandise {
-      ... on ProductVariant {
-        id
-        availableForSale
-        compareAtPrice {
-          ...Money
-        }
-        price {
-          ...Money
-        }
-        requiresShipping
-        title
-        image {
-          id
-          url
-          altText
-          width
-          height
-        }
-        product {
-          handle
-          title
-          id
-          vendor
+          options {
+            name
+            values
+          }
         }
         selectedOptions {
           name
@@ -132,9 +86,6 @@ export const CART_QUERY_FRAGMENT = `#graphql
       nodes {
         ...CartLine
       }
-      nodes {
-        ...CartLineComponent
-      }
     }
     cost {
       subtotalAmount {
@@ -231,3 +182,24 @@ export const FOOTER_QUERY = `#graphql
   }
   ${MENU_FRAGMENT}
 ` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/product
+
+export const PRODUCT_VARIANT_QUERY = `#graphql
+  query ProductVariant(
+    $productId: ID!
+    $selectedOptions: [SelectedOptionInput!]!
+    $country: CountryCode
+    $language: LanguageCode
+  ) @inContext(country: $country, language: $language) {
+    product(id: $productId) {
+        selectedVariant: variantBySelectedOptions(
+        selectedOptions: $selectedOptions
+        ignoreUnknownOptions: true
+        caseInsensitiveMatch: true
+      ) {
+        id
+      }
+    }
+  }
+`;

```

</details>

### 4. app/routes/cart.tsx

Custom cart method to update the line by selected options.

#### File: [`app/routes/cart.tsx`](/templates/skeleton/app/routes/cart.tsx)

```diff
index 62dc7602..805b9cc3 100644
--- a/templates/skeleton/app/routes/cart.tsx
+++ b/templates/skeleton/app/routes/cart.tsx
@@ -1,8 +1,17 @@
 import {type MetaFunction, useLoaderData} from '@remix-run/react';
 import type {CartQueryDataReturn} from '@shopify/hydrogen';
 import {CartForm} from '@shopify/hydrogen';
-import {data, type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersFunction} from '@shopify/remix-oxygen';
-import {CartMain} from '~/components/CartMain';
+import {
+  data,
+  type LoaderFunctionArgs,
+  type ActionFunctionArgs,
+  type HeadersFunction,
+} from '@shopify/remix-oxygen';
+import type {
+  SelectedOptionInput,
+  CartLineUpdateInput,
+} from '@shopify/hydrogen/storefront-api-types';
+import {CartMain} from '~/components/Cart';
 
 export const meta: MetaFunction = () => {
   return [{title: `Hydrogen | Cart`}];
@@ -25,6 +34,21 @@ export async function action({request, context}: ActionFunctionArgs) {
   let result: CartQueryDataReturn;
 
   switch (action) {
+
+    case 'CustomUpdateLineByOptions':
+      const {productId, line, ...selectedOptionsPairs} = inputs;
+
+      const selectedOptions = [];
+      for (const [name, value] of Object.entries(selectedOptionsPairs)) {
+        selectedOptions.push({name, value});
+      }
+
+      result = await cart.updateLineByOptions(
+        productId as string,
+        selectedOptions as SelectedOptionInput[],
+        line as CartLineUpdateInput,
+      );
+      break;
     case CartForm.ACTIONS.LinesAdd:
       result = await cart.addLines(inputs.lines);
       break;

```

### 5. Codegen



#### File: [`storefrontapi.generated.d.ts`](/templates/skeleton/storefrontapi.generated.d.ts)

<details>

```diff
index d27c5942..e96658f6 100644
--- a/templates/skeleton/storefrontapi.generated.d.ts
+++ b/templates/skeleton/storefrontapi.generated.d.ts
@@ -31,37 +31,10 @@ export type CartLineFragment = Pick<
     image?: StorefrontAPI.Maybe<
       Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
     >;
-    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
-    selectedOptions: Array<
-      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
-    >;
-  };
-};
-
-export type CartLineComponentFragment = Pick<
-  StorefrontAPI.ComponentizableCartLine,
-  'id' | 'quantity'
-> & {
-  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
-  cost: {
-    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
-      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-    >;
-  };
-  merchandise: Pick<
-    StorefrontAPI.ProductVariant,
-    'id' | 'availableForSale' | 'requiresShipping' | 'title'
-  > & {
-    compareAtPrice?: StorefrontAPI.Maybe<
-      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-    >;
-    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-    image?: StorefrontAPI.Maybe<
-      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
-    >;
-    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
+    product: Pick<
+      StorefrontAPI.Product,
+      'handle' | 'title' | 'id' | 'vendor'
+    > & {options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>};
     selectedOptions: Array<
       Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
     >;
@@ -90,76 +63,45 @@ export type CartApiQueryFragment = Pick<
   };
   lines: {
     nodes: Array<
-      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
-          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
-          cost: {
-            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-            amountPerQuantity: Pick<
-              StorefrontAPI.MoneyV2,
-              'currencyCode' | 'amount'
-            >;
-            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
-              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-            >;
-          };
-          merchandise: Pick<
-            StorefrontAPI.ProductVariant,
-            'id' | 'availableForSale' | 'requiresShipping' | 'title'
+      Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
+        attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
+        cost: {
+          totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
+          amountPerQuantity: Pick<
+            StorefrontAPI.MoneyV2,
+            'currencyCode' | 'amount'
+          >;
+          compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
+          >;
+        };
+        merchandise: Pick<
+          StorefrontAPI.ProductVariant,
+          'id' | 'availableForSale' | 'requiresShipping' | 'title'
+        > & {
+          compareAtPrice?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
+          >;
+          price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
+          image?: StorefrontAPI.Maybe<
+            Pick<
+              StorefrontAPI.Image,
+              'id' | 'url' | 'altText' | 'width' | 'height'
+            >
+          >;
+          product: Pick<
+            StorefrontAPI.Product,
+            'handle' | 'title' | 'id' | 'vendor'
           > & {
-            compareAtPrice?: StorefrontAPI.Maybe<
-              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-            >;
-            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-            image?: StorefrontAPI.Maybe<
-              Pick<
-                StorefrontAPI.Image,
-                'id' | 'url' | 'altText' | 'width' | 'height'
-              >
-            >;
-            product: Pick<
-              StorefrontAPI.Product,
-              'handle' | 'title' | 'id' | 'vendor'
-            >;
-            selectedOptions: Array<
-              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
-            >;
-          };
-        })
-      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
-          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
-          cost: {
-            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-            amountPerQuantity: Pick<
-              StorefrontAPI.MoneyV2,
-              'currencyCode' | 'amount'
-            >;
-            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
-              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-            >;
-          };
-          merchandise: Pick<
-            StorefrontAPI.ProductVariant,
-            'id' | 'availableForSale' | 'requiresShipping' | 'title'
-          > & {
-            compareAtPrice?: StorefrontAPI.Maybe<
-              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
-            >;
-            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
-            image?: StorefrontAPI.Maybe<
-              Pick<
-                StorefrontAPI.Image,
-                'id' | 'url' | 'altText' | 'width' | 'height'
-              >
-            >;
-            product: Pick<
-              StorefrontAPI.Product,
-              'handle' | 'title' | 'id' | 'vendor'
-            >;
-            selectedOptions: Array<
-              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
+            options: Array<
+              Pick<StorefrontAPI.ProductOption, 'name' | 'values'>
             >;
           };
-        })
+          selectedOptions: Array<
+            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
+          >;
+        };
+      }
     >;
   };
   cost: {
@@ -288,6 +230,23 @@ export type FooterQuery = {
   >;
 };
 
+export type ProductVariantQueryVariables = StorefrontAPI.Exact<{
+  productId: StorefrontAPI.Scalars['ID']['input'];
+  selectedOptions:
+    | Array<StorefrontAPI.SelectedOptionInput>
+    | StorefrontAPI.SelectedOptionInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type ProductVariantQuery = {
+  product?: StorefrontAPI.Maybe<{
+    selectedVariant?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.ProductVariant, 'id'>
+    >;
+  }>;
+};
+
 export type StoreRobotsQueryVariables = StorefrontAPI.Exact<{
   country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
   language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
@@ -1173,6 +1132,10 @@ interface GeneratedQueryTypes {
     return: FooterQuery;
     variables: FooterQueryVariables;
   };
+  '#graphql\n  query ProductVariant(\n    $productId: ID!\n    $selectedOptions: [SelectedOptionInput!]!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    product(id: $productId) {\n        selectedVariant: variantBySelectedOptions(\n        selectedOptions: $selectedOptions\n        ignoreUnknownOptions: true\n        caseInsensitiveMatch: true\n      ) {\n        id\n      }\n    }\n  }\n': {
+    return: ProductVariantQuery;
+    variables: ProductVariantQueryVariables;
+  };
   '#graphql\n  query StoreRobots($country: CountryCode, $language: LanguageCode)\n   @inContext(country: $country, language: $language) {\n    shop {\n      id\n    }\n  }\n': {
     return: StoreRobotsQuery;
     variables: StoreRobotsQueryVariables;

```

</details>