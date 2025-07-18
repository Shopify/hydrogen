# Subscriptions

This recipe lets you sell subscription-based products on your Hydrogen storefront by implementing [selling plan groups](https://shopify.dev/docs/api/storefront/latest/objects/SellingPlanGroup). Your customers will be able to choose between one-time purchases or recurring subscriptions for any products with available selling plans.

In this recipe you'll make the following changes:

1. Set up a subscriptions app in your Shopify admin and add selling plans to any products that will be sold as subscriptions.
2. Modify product detail pages to display subscription options with accurate pricing using the `SellingPlanSelector` component.
3. Enhance GraphQL fragments to fetch all necessary selling plan data.
4. Display subscription details on applicable line items in the cart.
5. Add a **Subscriptions** page where customers can manage their subscriptions, which includes the option to cancel active subscriptions.

## Requirements

To implement subscriptions in your own store, you need to install a subscriptions app in your Shopify admin. In this recipe, we'll use the [Shopify Subscriptions app](https://apps.shopify.com/shopify-subscriptions).

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/SellingPlanSelector.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/components/SellingPlanSelector.tsx) | Displays the available subscription options on product pages. |
| [app/graphql/customer-account/CustomerSubscriptionsMutations.ts](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsMutations.ts) | Mutations for managing customer subscriptions. |
| [app/graphql/customer-account/CustomerSubscriptionsQuery.ts](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsQuery.ts) | Queries for managing customer subscriptions. |
| [app/routes/account.subscriptions.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/routes/account.subscriptions.tsx) | Subscriptions management page. |
| [app/styles/account-subscriptions.css](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/account-subscriptions.css) | Subscriptions management page styles. |
| [app/styles/selling-plan.css](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/selling-plan.css) | Styles the `SellingPlanSelector` component. |

## Steps

### Step 1: Set up the Shopify Subscriptions app

1. Install the [Shopify Subscriptions app](https://apps.shopify.com/shopify-subscriptions).
2. In your Shopify admin, [use the Subscriptions app](https://admin.shopify.com/apps/subscriptions-remix/app) to create one or more subscription plans.
3. On the [Products](https://admin.shopify.com/products) page, open any products that will be sold as subscriptions and add the relevant subscription plans in the **Purchase options** section.
The Hydrogen demo storefront comes pre-configured with an example subscription product with the handle `shopify-wax`.

### Step 2: Show subscription options on product pages

In this step we'll implement the ability to display subscription options on  product pages, alongside the existing one-off purchase options.

#### Step 2.1: Create a SellingPlanSelector component

Create a new `SellingPlanSelector` component that displays the available subscription options for a product.

##### File: [SellingPlanSelector.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/components/SellingPlanSelector.tsx)

<details>

```tsx
import type {
  ProductFragment,
  SellingPlanGroupFragment,
  SellingPlanFragment,
} from 'storefrontapi.generated';
import {useMemo} from 'react';
import {useLocation} from 'react-router';

/* Enriched sellingPlan type including isSelected and url */
export type SellingPlan = SellingPlanFragment & {
  isSelected: boolean;
  url: string;
};

/* Enriched sellingPlanGroup type including enriched SellingPlan nodes */
export type SellingPlanGroup = Omit<
  SellingPlanGroupFragment,
  'sellingPlans'
> & {
  sellingPlans: {
    nodes: SellingPlan[];
  };
};

/**
 * A component that simplifies selecting sellingPlans subscription options
 * @example Example use
 * ```ts
 *   <SellingPlanSelector
 *     sellingPlanGroups={sellingPlanGroups}
 *     selectedSellingPlanId={selectedSellingPlanId}
 *   >
 *     {({sellingPlanGroup}) => ( ...your sellingPlanGroup component )}
 *  </SellingPlanSelector>
 *  ```
 **/
export function SellingPlanSelector({
  sellingPlanGroups,
  selectedSellingPlan,
  children,
  paramKey = 'selling_plan',
  selectedVariant,
}: {
  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
  selectedSellingPlan: SellingPlanFragment | null;
  paramKey?: string;
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  children: (params: {
    sellingPlanGroup: SellingPlanGroup;
    selectedSellingPlan: SellingPlanFragment | null;
  }) => React.ReactNode;
}) {
  const {search, pathname} = useLocation();
  const params = new URLSearchParams(search);

  const planAllocationIds: string[] =
    selectedVariant?.sellingPlanAllocations.nodes.map(
      (node) => node.sellingPlan.id,
    ) ?? [];

  return useMemo(
    () =>
      (sellingPlanGroups.nodes as SellingPlanGroup[])
        // Filter out groups that don't have plans usable for the selected variant
        .filter((group) => {
          return group.sellingPlans.nodes.some((sellingPlan) =>
            planAllocationIds.includes(sellingPlan.id),
          );
        })
        .map((sellingPlanGroup) => {
          // Augment each sellingPlan node with isSelected and url
          const sellingPlans = sellingPlanGroup.sellingPlans.nodes
            .map((sellingPlan: SellingPlan) => {
              if (!sellingPlan?.id) {
                console.warn(
                  'SellingPlanSelector: sellingPlan.id is missing in the product query',
                );
                return null;
              }

              if (!sellingPlan.id) {
                return null;
              }

              params.set(paramKey, sellingPlan.id);
              sellingPlan.isSelected =
                selectedSellingPlan?.id === sellingPlan.id;
              sellingPlan.url = `${pathname}?${params.toString()}`;
              return sellingPlan;
            })
            .filter(Boolean) as SellingPlan[];
          sellingPlanGroup.sellingPlans.nodes = sellingPlans;
          return children({sellingPlanGroup, selectedSellingPlan});
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sellingPlanGroups,
      children,
      selectedSellingPlan,
      paramKey,
      pathname,
      selectedVariant,
    ],
  );
}

```

</details>

#### Step 2.2: Add styles for the SellingPlanSelector component

Add styles for the `SellingPlanSelector` component.

##### File: [selling-plan.css](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/selling-plan.css)

<details>

```css
.selling-plan-group {
  margin-bottom: 1rem;
}

.selling-plan-group-title {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.selling-plan {
  border: 1px solid;
  display: inline-block;
  padding: 1rem;
  margin-right: 0.5rem;
  line-height: 1;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  border-bottom-width: 1.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.selling-plan:hover {
  text-decoration: none;
}

.selling-plan.selected {
  border-color: #6b7280; /* Equivalent to 'border-gray-500' */
}

.selling-plan.unselected {
  border-color: #fafafa; /* Equivalent to 'border-neutral-50' */
}

```

</details>

#### Step 2.3: Update ProductForm to support subscriptions

1. Add conditional rendering to display subscription options alongside the standard variant selectors.
2. Implement `SellingPlanSelector` and `SellingPlanGroup` components to handle subscription plan selection.
3. Update `AddToCartButton` to include selling plan data when subscriptions are selected.

##### File: [app/components/ProductForm.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/components/ProductForm.tsx)

<details>

```diff
index 61290120..234b151a 100644
--- a/templates/skeleton/app/components/ProductForm.tsx
+++ b/templates/skeleton/app/components/ProductForm.tsx
@@ -6,14 +6,25 @@ import type {
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
@@ -120,6 +131,47 @@ export function ProductForm({
       >
         {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
       </AddToCartButton>
+      {sellingPlanGroups.nodes.length > 0 ? (
+        <>
+          <br />
+          <hr />
+          <br />
+          <h3>Subscription Options</h3>
+          <SellingPlanSelector
+            sellingPlanGroups={sellingPlanGroups}
+            selectedSellingPlan={selectedSellingPlan}
+            selectedVariant={selectedVariant}
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
+      ) : null}
     </div>
   );
 }
@@ -148,3 +200,38 @@ function ProductOptionSwatch({
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

#### Step 2.4: Update ProductPrice to display subscription pricing

1. Add a `SellingPlanPrice` function to calculate adjusted prices based on subscription plan type (fixed amount, fixed price, or percentage).
2. Add logic to handle different price adjustment types and render the appropriate subscription price when a selling plan is selected.

##### File: [app/components/ProductPrice.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/components/ProductPrice.tsx)

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

#### Step 2.5: Update the product page to display subscription options

1. Add the `SellingPlanSelector` component to display subscription options on product pages.
2. Add logic to handle pricing adjustments, maintain selection state using URL parameters, and update the add-to-cart functionality.
3. Fetch subscription data through the updated cart GraphQL fragments.

##### File: [app/routes/products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 4989ca00..af30bc92 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,5 +1,6 @@
+import type {SellingPlanFragment} from 'storefrontapi.generated';
 import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import { useLoaderData, type MetaFunction } from 'react-router';
+import {LinksFunction, useLoaderData, type MetaFunction} from 'react-router';
 import {
   getSelectedProductOptions,
   Analytics,
@@ -13,6 +14,12 @@ import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
 import {redirectIfHandleIsLocalized} from '~/lib/redirect';
 
+import sellingPanStyle from '~/styles/selling-plan.css?url';
+
+export const links: LinksFunction = () => [
+  {rel: 'stylesheet', href: sellingPanStyle},
+];
+
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [
     {title: `Hydrogen | ${data?.product.title ?? ''}`},
@@ -63,8 +70,34 @@ async function loadCriticalData({
   // The API handle might be localized, so redirect to the localized handle
   redirectIfHandleIsLocalized(request, {handle, data: product});
 
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
 
@@ -81,7 +114,7 @@ function loadDeferredData({context, params}: LoaderFunctionArgs) {
 }
 
 export default function Product() {
-  const {product} = useLoaderData<typeof loader>();
+  const {product, selectedSellingPlan} = useLoaderData<typeof loader>();
 
   // Optimistically selects a variant with given available variant information
   const selectedVariant = useOptimisticVariant(
@@ -99,7 +132,7 @@ export default function Product() {
     selectedOrFirstAvailableVariant: selectedVariant,
   });
 
-  const {title, descriptionHtml} = product;
+  const {title, descriptionHtml, sellingPlanGroups} = product;
 
   return (
     <div className="product">
@@ -109,11 +142,15 @@ export default function Product() {
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
@@ -177,9 +214,83 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
       amount
       currencyCode
     }
+    sellingPlanAllocations(first: 10) {
+      nodes {
+        sellingPlan {
+          id
+        }
+      }
+    }
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
@@ -207,6 +318,11 @@ const PRODUCT_FRAGMENT = `#graphql
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
@@ -218,6 +334,7 @@ const PRODUCT_FRAGMENT = `#graphql
       title
     }
   }
+  ${SELLING_PLAN_GROUP_FRAGMENT}
   ${PRODUCT_VARIANT_FRAGMENT}
 ` as const;
```

</details>

### Step 3: Show subscription details in the cart

In this step we'll implement support for showing subscription info in the cart's line items.

#### Step 3.1: Add selling plan data to cart queries

Add a `sellingPlanAllocation` field with the plan name to the standard and componentizable cart line GraphQL fragments. This displays subscription details in the cart.

##### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/lib/fragments.ts)

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

#### Step 3.2: Render the selling plan in the cart

1. Update `CartLineItem` to show subscription details when they're available.
2. Extract `sellingPlanAllocation` from cart line data, display the plan name, and standardize component import paths.

##### File: [app/components/CartLineItem.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/components/CartLineItem.tsx)

```diff
index c96b3d83..cf9fdeaf 100644
--- a/templates/skeleton/app/components/CartLineItem.tsx
+++ b/templates/skeleton/app/components/CartLineItem.tsx
@@ -3,8 +3,8 @@ import type {CartLayout} from '~/components/CartMain';
 import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
 import {useVariantUrl} from '~/lib/variants';
 import { Link } from 'react-router';
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

### Step 4: Add subscription management to the account page

In this step we'll implement support for subscription management through an account subpage that lists existing subscription contracts.

#### Step 4.1: Add queries to retrieve customer subscriptions

Create GraphQL queries that retrieve the subscription info from the customer account client.

##### File: [CustomerSubscriptionsQuery.ts](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsQuery.ts)

<details>

```ts
// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer

const SUBSCRIPTION_CONTRACT_FRAGMENT = `#graphql
  fragment SubscriptionContract on SubscriptionContract {
    id
    status
    createdAt
    billingPolicy {
      ...SubscriptionBillingPolicy
    }
  }
  fragment SubscriptionBillingPolicy on SubscriptionBillingPolicy {
    interval
    intervalCount {
      count
      precision
    }
  }
` as const;

export const SUBSCRIPTIONS_CONTRACTS_QUERY = `#graphql
  query SubscriptionsContractsQuery {
    customer {
      subscriptionContracts(first: 100) {
        nodes {
          ...SubscriptionContract
          lines(first: 100) {
            nodes {
              name
              id
            }
          }
        }
      }
    }
  }
  ${SUBSCRIPTION_CONTRACT_FRAGMENT}
` as const;

```

</details>

#### Step 4.2: Add mutations to cancel customer subscriptions

Create a GraqhQL mutation to cancel an existing subscription.

##### File: [CustomerSubscriptionsMutations.ts](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsMutations.ts)

<details>

```ts
// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer

export const SUBSCRIPTION_CANCEL_MUTATION = `#graphql
  mutation subscriptionContractCancel($subscriptionContractId: ID!) {
    subscriptionContractCancel(subscriptionContractId: $subscriptionContractId) {
      contract {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

```

</details>

#### Step 4.3: Add an account subscriptions page

Create a new account subpage that lets customers manage their existing  subscriptions based on the new GraphQL queries and mutations.

##### File: [account.subscriptions.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/routes/account.subscriptions.tsx)

<details>

```tsx
import type {SubscriptionBillingPolicyFragment} from 'customer-accountapi.generated';
import {
  data,
  LinksFunction,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {
  useActionData,
  useFetcher,
  useLoaderData,
  type MetaFunction,
} from 'react-router';
import {SUBSCRIPTIONS_CONTRACTS_QUERY} from '../graphql/customer-account/CustomerSubscriptionsQuery';
import {SUBSCRIPTION_CANCEL_MUTATION} from '../graphql/customer-account/CustomerSubscriptionsMutations';

import accountSubscriptionsStyle from '~/styles/account-subscriptions.css?url';

export type ActionResponse = {
  error: string | null;
};

export const meta: MetaFunction = () => {
  return [{title: 'Subscriptions'}];
};

export const links: LinksFunction = () => [
  {rel: 'stylesheet', href: accountSubscriptionsStyle},
];

export async function loader({context}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();

  const {data: subscriptions} = await context.customerAccount.query(
    SUBSCRIPTIONS_CONTRACTS_QUERY,
  );

  return {subscriptions};
}

export async function action({request, context}: ActionFunctionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'DELETE') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const subId = form.get('subId');

    if (!subId) {
      throw new Error('Subscription ID is required');
    }

    await customerAccount.mutate(SUBSCRIPTION_CANCEL_MUTATION, {
      variables: {
        subscriptionContractId: subId.toString(),
      },
    });

    return {
      error: null,
    };
  } catch (error: any) {
    return data(
      {
        error: error.message,
      },
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const action = useActionData<ActionResponse>();

  const {subscriptions} = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  return (
    <div className="account-profile">
      <h2>My subscriptions</h2>
      {action?.error ? (
        <p>
          <mark>
            <small>{action.error}</small>
          </mark>
        </p>
      ) : null}
      <div className="account-subscriptions">
        {subscriptions?.customer?.subscriptionContracts.nodes.map(
          (subscription) => {
            const isBeingCancelled =
              fetcher.state !== 'idle' &&
              fetcher.formData?.get('subId') === subscription.id;
            return (
              <div key={subscription.id} className="subscription-row">
                <div className="subscription-row-content">
                  <div>
                    {subscription.lines.nodes.map((line) => (
                      <div key={line.id}>{line.name}</div>
                    ))}
                  </div>
                  <div>
                    Every{' '}
                    <SubscriptionInterval
                      billingPolicy={subscription.billingPolicy}
                    />
                  </div>
                </div>
                <div className="subscription-row-actions">
                  <div
                    className={
                      subscription.status === 'ACTIVE'
                        ? 'subscription-status-active'
                        : 'subscription-status-inactive'
                    }
                  >
                    {subscription.status}
                  </div>
                  {subscription.status === 'ACTIVE' && (
                    <fetcher.Form key={subscription.id} method="DELETE">
                      <input
                        type="hidden"
                        id="subId"
                        name="subId"
                        value={subscription.id}
                      />
                      <button type="submit" disabled={isBeingCancelled}>
                        {isBeingCancelled ? 'Canceling' : 'Cancel subscription'}
                      </button>
                    </fetcher.Form>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

function SubscriptionInterval({
  billingPolicy,
}: {
  billingPolicy: SubscriptionBillingPolicyFragment;
}) {
  const count = billingPolicy.intervalCount?.count;
  function getInterval() {
    const suffix = count === 1 ? '' : 's';
    switch (billingPolicy.interval) {
      case 'DAY':
        return 'day' + suffix;
      case 'WEEK':
        return 'week' + suffix;
      case 'MONTH':
        return 'month' + suffix;
      case 'YEAR':
        return 'year' + suffix;
    }
  }
  return (
    <span>
      {count} {getInterval()}
    </span>
  );
}

```

</details>

#### Step 4.4: Add a link to the Subscriptions page in the account menu

Add a `Subscriptions` link to the account menu.

##### File: [app/routes/account.tsx](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/templates/skeleton/app/routes/account.tsx)

```diff
index 29e641f4..9ee30fd4 100644
--- a/templates/skeleton/app/routes/account.tsx
+++ b/templates/skeleton/app/routes/account.tsx
@@ -1,6 +1,8 @@
-
-import {data as remixData, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import { Form, NavLink, Outlet, useLoaderData } from 'react-router';
+import {
+  data as remixData,
+  type LoaderFunctionArgs,
+} from '@shopify/remix-oxygen';
+import {Form, NavLink, Outlet, useLoaderData} from 'react-router';
 import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
 
 export function shouldRevalidate() {
@@ -80,6 +82,9 @@ function AccountMenu() {
         &nbsp; Addresses &nbsp;
       </NavLink>
       &nbsp;|&nbsp;
+      <NavLink to="/account/subscriptions" style={isActiveStyle}>
+        &nbsp; Subscriptions &nbsp;
+      </NavLink>
       <Logout />
     </nav>
   );
```

#### Step 4.5: Add styles for the Subscriptions page

Add styles for the Subscriptions page.

##### File: [account-subscriptions.css](https://github.com/Shopify/hydrogen/blob/6d5b52d60a3c22dddf133926cdcee1606af46d0e/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/account-subscriptions.css)

<details>

```css
.account-subscriptions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account-subscriptions .subscription-row {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid lightgray;
  padding: 10px;
}

.account-subscriptions .subscription-row .subscription-row-content {
  display: flex;
  gap: 10px;
  flex: 1;
}

.account-subscriptions .subscription-row .subscription-row-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.account-subscriptions .subscription-row .subscription-status-active {
  color: green;
}

.account-subscriptions .subscription-row .subscription-status-inactive {
  color: gray;
}

```

</details>

## Next steps

- Test your implementation by going to your store and adding a subscription-based product to the cart. Make sure that the product's subscription details appear on the product page and in the cart.
- (Optional) [Place a test order](https://help.shopify.com/en/manual/checkout-settings/test-orders) to see how orders for subscription-based products appear in your Shopify admin.