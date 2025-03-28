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

- `app/components/SellingPlanSelector.tsx`
- `app/styles/selling-plan.css`

### 3. Render the selling plan in the cart

CartLineItem now displays subscription plan names when customers add subscription products to their cart.


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

### 4. app/components/ProductForm.tsx



#### File: [`app/components/ProductForm.tsx`](/templates/skeleton/app/components/ProductForm.tsx)

<details>

```diff
index e8616a61..e41b91ad 100644
--- a/templates/skeleton/app/components/ProductForm.tsx
+++ b/templates/skeleton/app/components/ProductForm.tsx
@@ -6,120 +6,169 @@ import type {
 } from '@shopify/hydrogen/storefront-api-types';
 import {AddToCartButton} from './AddToCartButton';
 import {useAside} from './Aside';
-import type {ProductFragment} from 'storefrontapi.generated';
+import type {
+  ProductFragment,
+  SellingPlanFragment,
+} from 'storefrontapi.generated';
+import {
+  SellingPlanSelector,
+  type SellingPlanGroup,
+} from '~/components/SellingPlanSelector';
 
 export function ProductForm({
   productOptions,
   selectedVariant,
+  sellingPlanGroups,
+  selectedSellingPlan,
 }: {
   productOptions: MappedProductOptions[];
   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
+  selectedSellingPlan: SellingPlanFragment | null;
+  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
 }) {
   const navigate = useNavigate();
   const {open} = useAside();
   return (
     <div className="product-form">
-      {productOptions.map((option) => {
-        // If there is only a single value in the option values, don't display the option
-        if (option.optionValues.length === 1) return null;
+      {sellingPlanGroups.nodes.length > 0 ? (
+        <>
+          <SellingPlanSelector
+            sellingPlanGroups={sellingPlanGroups}
+            selectedSellingPlan={selectedSellingPlan}
+          >
+            {({sellingPlanGroup}) => (
+              <SellingPlanGroup
+                key={sellingPlanGroup.name}
+                sellingPlanGroup={sellingPlanGroup}
+              />
+            )}
+          </SellingPlanSelector>
+          <br />
+          <AddToCartButton
+            disabled={!selectedSellingPlan}
+            onClick={() => {
+              open('cart');
+            }}
+            lines={
+              selectedSellingPlan && selectedVariant
+                ? [
+                    {
+                      quantity: 1,
+                      selectedVariant,
+                      sellingPlanId: selectedSellingPlan.id,
+                      merchandiseId: selectedVariant.id,
+                    },
+                  ]
+                : []
+            }
+          >
+            {selectedSellingPlan ? 'Subscribe' : 'Select Subscription'}
+          </AddToCartButton>
+        </>
+      ) : (
+        productOptions.map((option) => {
+          // If there is only a single value in the option values, don't display the option
+          if (option.optionValues.length === 1) return null;
 
-        return (
-          <div className="product-options" key={option.name}>
-            <h5>{option.name}</h5>
-            <div className="product-options-grid">
-              {option.optionValues.map((value) => {
-                const {
-                  name,
-                  handle,
-                  variantUriQuery,
-                  selected,
-                  available,
-                  exists,
-                  isDifferentProduct,
-                  swatch,
-                } = value;
+          return (
+            <div className="product-options" key={option.name}>
+              <h5>{option.name}</h5>
+              <div className="product-options-grid">
+                {option.optionValues.map((value) => {
+                  const {
+                    name,
+                    handle,
+                    variantUriQuery,
+                    selected,
+                    available,
+                    exists,
+                    isDifferentProduct,
+                    swatch,
+                  } = value;
 
-                if (isDifferentProduct) {
-                  // SEO
-                  // When the variant is a combined listing child product
-                  // that leads to a different url, we need to render it
-                  // as an anchor tag
-                  return (
-                    <Link
-                      className="product-options-item"
-                      key={option.name + name}
-                      prefetch="intent"
-                      preventScrollReset
-                      replace
-                      to={`/products/${handle}?${variantUriQuery}`}
-                      style={{
-                        border: selected
-                          ? '1px solid black'
-                          : '1px solid transparent',
-                        opacity: available ? 1 : 0.3,
-                      }}
-                    >
-                      <ProductOptionSwatch swatch={swatch} name={name} />
-                    </Link>
-                  );
-                } else {
-                  // SEO
-                  // When the variant is an update to the search param,
-                  // render it as a button with javascript navigating to
-                  // the variant so that SEO bots do not index these as
-                  // duplicated links
-                  return (
-                    <button
-                      type="button"
-                      className={`product-options-item${
-                        exists && !selected ? ' link' : ''
-                      }`}
-                      key={option.name + name}
-                      style={{
-                        border: selected
-                          ? '1px solid black'
-                          : '1px solid transparent',
-                        opacity: available ? 1 : 0.3,
-                      }}
-                      disabled={!exists}
-                      onClick={() => {
-                        if (!selected) {
-                          navigate(`?${variantUriQuery}`, {
-                            replace: true,
-                            preventScrollReset: true,
-                          });
-                        }
-                      }}
-                    >
-                      <ProductOptionSwatch swatch={swatch} name={name} />
-                    </button>
-                  );
+                  if (isDifferentProduct) {
+                    // SEO
+                    // When the variant is a combined listing child product
+                    // that leads to a different url, we need to render it
+                    // as an anchor tag
+                    return (
+                      <Link
+                        className="product-options-item"
+                        key={option.name + name}
+                        prefetch="intent"
+                        preventScrollReset
+                        replace
+                        to={`/products/${handle}?${variantUriQuery}`}
+                        style={{
+                          border: selected
+                            ? '1px solid black'
+                            : '1px solid transparent',
+                          opacity: available ? 1 : 0.3,
+                        }}
+                      >
+                        <ProductOptionSwatch swatch={swatch} name={name} />
+                      </Link>
+                    );
+                  } else {
+                    // SEO
+                    // When the variant is an update to the search param,
+                    // render it as a button with javascript navigating to
+                    // the variant so that SEO bots do not index these as
+                    // duplicated links
+                    return (
+                      <button
+                        type="button"
+                        className={`product-options-item${
+                          exists && !selected ? ' link' : ''
+                        }`}
+                        key={option.name + name}
+                        style={{
+                          border: selected
+                            ? '1px solid black'
+                            : '1px solid transparent',
+                          opacity: available ? 1 : 0.3,
+                        }}
+                        disabled={!exists}
+                        onClick={() => {
+                          if (!selected) {
+                            navigate(`?${variantUriQuery}`, {
+                              replace: true,
+                              preventScrollReset: true,
+                            });
+                          }
+                        }}
+                      >
+                        <ProductOptionSwatch swatch={swatch} name={name} />
+                      </button>
+                    );
+                  }
+                })}
+              </div>
+              <AddToCartButton
+                disabled={!selectedVariant || !selectedVariant.availableForSale}
+                onClick={() => {
+                  open('cart');
+                }}
+                lines={
+                  selectedVariant
+                    ? [
+                        {
+                          merchandiseId: selectedVariant.id,
+                          quantity: 1,
+                          selectedVariant,
+                        },
+                      ]
+                    : []
                 }
-              })}
+              >
+                {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
+              </AddToCartButton>
+
+              <br />
             </div>
-            <br />
-          </div>
-        );
-      })}
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
+          );
+        })
+      )}
     </div>
   );
 }
@@ -148,3 +197,38 @@ function ProductOptionSwatch({
     </div>
   );
 }
+
+// Update as you see fit to match your design and requirements
+function SellingPlanGroup({
+  sellingPlanGroup,
+}: {
+  sellingPlanGroup: SellingPlanGroup;
+}) {
+  return (
+    <div className="selling-plan-group" key={sellingPlanGroup.name}>
+      <p className="selling-plan-group-title">
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
+            <p>
+              {sellingPlan.options.map(
+                (option) => `${option.name} ${option.value}`,
+              )}
+            </p>
+          </Link>
+        );
+      })}
+    </div>
+  );
+}

```

</details>

### 5. app/components/ProductPrice.tsx



#### File: [`app/components/ProductPrice.tsx`](/templates/skeleton/app/components/ProductPrice.tsx)

<details>

```diff
index 32460ae2..59eed1d8 100644
--- a/templates/skeleton/app/components/ProductPrice.tsx
+++ b/templates/skeleton/app/components/ProductPrice.tsx
@@ -1,13 +1,31 @@
+import type {CurrencyCode} from '@shopify/hydrogen/customer-account-api-types';
+import type {
+  ProductFragment,
+  SellingPlanFragment,
+} from 'storefrontapi.generated';
 import {Money} from '@shopify/hydrogen';
 import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
 
 export function ProductPrice({
   price,
   compareAtPrice,
+  selectedSellingPlan,
+  selectedVariant,
 }: {
   price?: MoneyV2;
   compareAtPrice?: MoneyV2 | null;
+  selectedVariant?: ProductFragment['selectedOrFirstAvailableVariant'];
+  selectedSellingPlan?: SellingPlanFragment | null;
 }) {
+  if (selectedSellingPlan) {
+    return (
+      <SellingPlanPrice
+        selectedSellingPlan={selectedSellingPlan}
+        selectedVariant={selectedVariant}
+      />
+    );
+  }
+
   return (
     <div className="product-price">
       {compareAtPrice ? (
@@ -25,3 +43,74 @@ export function ProductPrice({
     </div>
   );
 }
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
+  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
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

```

</details>

### 6. Add Selling Plan Data to Cart Queries

Updates cart GraphQL fragments to include subscription plan names, enabling e.g "Subscribe and save" messaging in the applicable cart lines


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

### 7. Add SellingPlanSelector to product pages

Adds SellingPlanSelector component to display subscription options on product pages. Handles pricing adjustments, maintains selection state via URL parameters, and updates add-to-cart functionality. Fetches subscription data through the updated cart GraphQL fragments.


#### File: [`app/routes/products.$handle.tsx`](/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 0028b423..9f634090 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,3 +1,5 @@
+import type {SellingPlanFragment} from 'storefrontapi.generated';
+import type {LinksFunction} from '@remix-run/node';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {useLoaderData, type MetaFunction} from '@remix-run/react';
 import {
@@ -12,6 +14,12 @@ import {ProductPrice} from '~/components/ProductPrice';
 import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
 
+import sellingPanStyle from '~/styles/selling-plan.css?url';
+
+export const links: LinksFunction = () => [
+  {rel: 'stylesheet', href: sellingPanStyle},
+];
+
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [
     {title: `Hydrogen | ${data?.product.title ?? ''}`},
@@ -59,8 +67,34 @@ async function loadCriticalData({
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
   return {
     product,
+    selectedSellingPlan,
   };
 }
 
@@ -77,7 +111,7 @@ function loadDeferredData({context, params}: LoaderFunctionArgs) {
 }
 
 export default function Product() {
-  const {product} = useLoaderData<typeof loader>();
+  const {product, selectedSellingPlan} = useLoaderData<typeof loader>();
 
   // Optimistically selects a variant with given available variant information
   const selectedVariant = useOptimisticVariant(
@@ -95,7 +129,7 @@ export default function Product() {
     selectedOrFirstAvailableVariant: selectedVariant,
   });
 
-  const {title, descriptionHtml} = product;
+  const {title, descriptionHtml, sellingPlanGroups} = product;
 
   return (
     <div className="product">
@@ -105,11 +139,15 @@ export default function Product() {
         <ProductPrice
           price={selectedVariant?.price}
           compareAtPrice={selectedVariant?.compareAtPrice}
+          selectedSellingPlan={selectedSellingPlan}
+          selectedVariant={selectedVariant}
         />
         <br />
         <ProductForm
           productOptions={productOptions}
           selectedVariant={selectedVariant}
+          selectedSellingPlan={selectedSellingPlan}
+          sellingPlanGroups={sellingPlanGroups}
         />
         <br />
         <br />
@@ -176,6 +214,73 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
   }
 ` as const;
 
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
 const PRODUCT_FRAGMENT = `#graphql
   fragment Product on Product {
     id
@@ -203,6 +308,11 @@ const PRODUCT_FRAGMENT = `#graphql
         }
       }
     }
+    sellingPlanGroups(first:10) {
+      nodes {
+        ...SellingPlanGroup
+      }
+    }
     selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
       ...ProductVariant
     }
@@ -214,6 +324,7 @@ const PRODUCT_FRAGMENT = `#graphql
       title
     }
   }
+  ${SELLING_PLAN_GROUP_FRAGMENT}
   ${PRODUCT_VARIANT_FRAGMENT}
 ` as const;
 

```

</details>