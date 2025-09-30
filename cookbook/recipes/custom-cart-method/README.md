# Custom Cart Method

This recipe demonstrates how to implement custom cart methods in Hydrogen to enable inline editing of product options directly within the cart. Users can change product variants (size, color, etc.) without removing and re-adding items.

Key features:
- Custom cart method `updateLineByOptions` for variant selection
- Inline dropdown selectors for each product option in cart
- Automatic cart updates when options are changed
- Full TypeScript support with proper type augmentation

> [!NOTE]
> This implementation requires GraphQL codegen to be run after applying the recipe

> [!NOTE]
> The custom cart method uses the Storefront API's variantBySelectedOptions query

> [!NOTE]
> Cart updates happen automatically on option change without page refresh

## Requirements

- Basic understanding of Hydrogen cart implementation
- Familiarity with GraphQL and TypeScript
- Knowledge of React Router actions and forms

## Steps

### Step 1: README.md

Updates README with custom cart method documentation and implementation guide

#### File: [README.md](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/templates/skeleton/README.md)

<details>

```diff
index c584e5370..d40091392 100644
--- a/templates/skeleton/README.md
+++ b/templates/skeleton/README.md
@@ -1,6 +1,8 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Custom Cart Method
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This Hydrogen template demonstrates how to implement custom cart methods for inline product option editing. Hydrogen is Shopify's stack for headless commerce, designed to work with [Remix](https://remix.run/), Shopify's full stack web framework.
+
+This template shows how to enable users to change product variants (size, color, etc.) directly within the cart without removing and re-adding items, providing a smoother shopping experience.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -16,7 +18,29 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - Prettier
 - GraphQL generator
 - TypeScript and JavaScript flavors
-- Minimal setup of components and routes
+- **Custom cart method implementation**
+- **Inline variant selection in cart**
+- **Type-safe cart operations**
+
+## Custom Cart Method Features
+
+### Inline Option Editing
+- Change product variants directly in the cart
+- No need to remove and re-add items
+- Dropdown selectors for each product option (size, color, etc.)
+- Seamless user experience with instant updates
+
+### Technical Implementation
+- Custom `updateLineByOptions` cart method
+- TypeScript type augmentation for cart context
+- GraphQL fragments for product options
+- Optimistic UI updates with React Router actions
+
+### Cart Update Flow
+1. User selects new option from dropdown
+2. Custom cart method queries for new variant
+3. Cart line item updates with new variant
+4. Total price and inventory automatically adjust
 
 ## Getting started
 
@@ -28,6 +52,25 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 npm create @shopify/hydrogen@latest
 ```
 
+## Implementation Details
+
+### Custom Cart Method
+```typescript
+async updateLineByOptions(lineId: string, selectedOptions: any[]) {
+  const {product} = await storefront.query(VARIANTS_QUERY, {
+    variables: {handle: productHandle, selectedOptions}
+  });
+  
+  return cart.updateLineItems([{
+    id: lineId,
+    merchandiseId: product.variantBySelectedOptions?.id
+  }]);
+}
+```
+
+### Type Augmentation
+The recipe extends Hydrogen's cart context with proper TypeScript types for the custom method, ensuring type safety throughout your application.
+
 ## Building for production
 
 ```bash
@@ -40,6 +83,21 @@ npm run build
 npm run dev
 ```
 
+## Important Notes
+
+After applying this recipe:
+1. Run `npm run codegen` to generate GraphQL types
+2. Test with products that have multiple variants
+3. Verify inventory updates when switching variants
+
+## Customization
+
+You can extend this pattern to:
+- Add custom validation for option combinations
+- Implement bundle editing capabilities
+- Create quick-add features with variant selection
+- Build advanced cart customization flows
+
 ## Setup for using Customer Account API (`/account` section)
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
\ No newline at end of file
```

</details>

### Step 2: app/components/CartLineItem.tsx

Adds variant selector functionality to cart line items for changing product options

#### File: [app/components/CartLineItem.tsx](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/templates/skeleton/app/components/CartLineItem.tsx)

<details>

```diff
index 80e34be28..2f37ea800 100644
--- a/templates/skeleton/app/components/CartLineItem.tsx
+++ b/templates/skeleton/app/components/CartLineItem.tsx
@@ -1,6 +1,15 @@
-import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
+import type {
+  CartLineUpdateInput,
+  SelectedOption,
+} from '@shopify/hydrogen/storefront-api-types';
 import type {CartLayout} from '~/components/CartMain';
-import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
+import {
+  CartForm,
+  Image,
+  type OptimisticCartLine,
+  VariantSelector,
+  type VariantOption,
+} from '@shopify/hydrogen';
 import {useVariantUrl} from '~/lib/variants';
 import {Link} from 'react-router';
 import {ProductPrice} from './ProductPrice';
@@ -54,13 +63,8 @@ export function CartLineItem({
         </Link>
         <ProductPrice price={line?.cost?.totalAmount} />
         <ul>
-          {selectedOptions.map((option) => (
-            <li key={option.name}>
-              <small>
-                {option.name}: {option.value}
-              </small>
-            </li>
-          ))}
+          {/* @description Add inline product option editing in cart */}
+          <CartLineUpdateByOptionsForm line={line} />
         </ul>
         <CartLineQuantity line={line} />
       </div>
@@ -166,3 +170,87 @@ function CartLineUpdateButton({
 function getUpdateKey(lineIds: string[]) {
   return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
 }
+
+// @description Component for updating cart line item options
+function CartLineUpdateByOptionsForm({line}: {line: CartLine}) {
+  const {
+    merchandise: {product, selectedOptions},
+  } = line;
+
+  return (
+    <CartForm
+      route="/cart"
+      action="CustomUpdateLineByOptions"
+      inputs={{
+        productId: product.id,
+        line: {
+          id: line.id,
+          quantity: line.quantity,
+          attributes: line.attributes,
+        },
+      }}
+    >
+      {(fetcher) => (
+        <>
+          <VariantSelector
+            handle={product.handle}
+            options={product.options}
+            variants={[]}
+          >
+            {({option}) => (
+              <LineItemOptions
+                option={option}
+                selectedOptions={selectedOptions}
+                onChange={(event) => {
+                  void fetcher.submit(event.currentTarget.form, {
+                    method: 'POST',
+                  });
+                }}
+              />
+            )}
+          </VariantSelector>
+          <noscript>
+            <button type="submit">Update</button>
+          </noscript>
+        </>
+      )}
+    </CartForm>
+  );
+}
+
+function LineItemOptions({
+  option,
+  selectedOptions,
+  onChange,
+}: {
+  option: VariantOption;
+  selectedOptions: SelectedOption[];
+  onChange: React.ChangeEventHandler<HTMLSelectElement>;
+}) {
+  const defaultOption = selectedOptions.find(
+    (selectedOption) => selectedOption.name === option.name,
+  );
+
+  return (
+    <li key={option.name}>
+      <small>
+        {option.name}:{' '}
+        <select
+          name={option.name}
+          value={defaultOption?.value}
+          onChange={onChange}
+        >
+          {option.values.map(({value, isAvailable}) => (
+            <option
+              key={`optionValue-${value}`}
+              value={value}
+              disabled={!isAvailable}
+            >
+              {value}
+            </option>
+          ))}
+        </select>
+      </small>
+    </li>
+  );
+}
```

</details>

### Step 3: app/lib/context.ts

Extends HydrogenCart context with updateLineByOptions method for variant switching

#### File: [app/lib/context.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/templates/skeleton/app/lib/context.ts)

<details>

```diff
index 3989ec05e..6f7ea46fd 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,6 +1,15 @@
-import {createHydrogenContext} from '@shopify/hydrogen';
+import {
+  createHydrogenContext,
+  cartLinesUpdateDefault,
+  cartGetIdDefault,
+  type CartQueryDataReturn,
+} from '@shopify/hydrogen';
 import {AppSession} from '~/lib/session';
-import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
+import {CART_QUERY_FRAGMENT, PRODUCT_VARIANT_QUERY} from '~/lib/fragments';
+import type {
+  SelectedOptionInput,
+  CartLineUpdateInput,
+} from '@shopify/hydrogen/storefront-api-types';
 
 // Define the additional context object
 const additionalContext = {
@@ -16,6 +25,15 @@ type AdditionalContextType = typeof additionalContext;
 
 declare global {
   interface HydrogenAdditionalContext extends AdditionalContextType {}
+  
+  // @description Augment the cart with custom methods for variant selection
+  interface HydrogenCustomCartMethods {
+    updateLineByOptions: (
+      productId: string,
+      selectedOptions: SelectedOptionInput[],
+      line: CartLineUpdateInput,
+    ) => Promise<CartQueryDataReturn>;
+  }
 }
 
 /**
@@ -40,7 +58,8 @@ export async function createHydrogenRouterContext(
     AppSession.init(request, [env.SESSION_SECRET]),
   ]);
 
-  const hydrogenContext = createHydrogenContext(
+  // @description Create a placeholder context first to reference in customMethods
+  const hydrogenContext: ReturnType<typeof createHydrogenContext> = createHydrogenContext(
     {
       env,
       request,
@@ -51,6 +70,33 @@ export async function createHydrogenRouterContext(
       i18n: {language: 'EN', country: 'US'},
       cart: {
         queryFragment: CART_QUERY_FRAGMENT,
+        // @description Custom cart method for updating line items by variant options
+        customMethods: {
+          updateLineByOptions: async (
+            productId: string,
+            selectedOptions: SelectedOptionInput[],
+            line: CartLineUpdateInput,
+          ) => {
+            const {product} = await hydrogenContext.storefront.query(
+              PRODUCT_VARIANT_QUERY,
+              {
+                variables: {
+                  productId,
+                  selectedOptions,
+                },
+              },
+            );
+
+            const lines = [
+              {...line, merchandiseId: product?.selectedVariant?.id},
+            ];
+
+            return await cartLinesUpdateDefault({
+              storefront: hydrogenContext.storefront,
+              getCartId: cartGetIdDefault(request.headers),
+            })(lines);
+          },
+        },
       },
     },
     additionalContext,
```

</details>

### Step 4: app/lib/fragments.ts

Adds product options to cart fragments and creates PRODUCT_VARIANT_QUERY for fetching variants

#### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/templates/skeleton/app/lib/fragments.ts)

<details>

```diff
index cf35c25ea..cf79917eb 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -47,6 +47,11 @@ export const CART_QUERY_FRAGMENT = `#graphql
           title
           id
           vendor
+          # @description Add product options for variant selection
+          options {
+            name
+            values
+          }
         }
         selectedOptions {
           name
@@ -97,6 +102,11 @@ export const CART_QUERY_FRAGMENT = `#graphql
           title
           id
           vendor
+          # @description Add product options for variant selection
+          options {
+            name
+            values
+          }
         }
         selectedOptions {
           name
@@ -232,3 +242,23 @@ export const FOOTER_QUERY = `#graphql
   }
   ${MENU_FRAGMENT}
 ` as const;
+
+// @description Query to fetch product variant by selected options
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

### Step 5: app/routes/cart.tsx

Implements CustomUpdateLineByOptions action handler for processing variant changes in cart

#### File: [app/routes/cart.tsx](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/templates/skeleton/app/routes/cart.tsx)

```diff
index f82d683fd..f08a6777e 100644
--- a/templates/skeleton/app/routes/cart.tsx
+++ b/templates/skeleton/app/routes/cart.tsx
@@ -6,6 +6,10 @@ import {
 import type {Route} from './+types/cart';
 import type {CartQueryDataReturn} from '@shopify/hydrogen';
 import {CartForm} from '@shopify/hydrogen';
+import type {
+  SelectedOptionInput,
+  CartLineUpdateInput,
+} from '@shopify/hydrogen/storefront-api-types';
 import {CartMain} from '~/components/CartMain';
 
 export const meta: Route.MetaFunction = () => {
@@ -29,6 +33,21 @@ export async function action({request, context}: Route.ActionArgs) {
   let result: CartQueryDataReturn;
 
   switch (action) {
+    // @description Handle custom action for updating line item variant options
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