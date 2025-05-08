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
| [app/components/SellingPlanSelector.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/components/SellingPlanSelector.tsx) | Displays the available subscription options on product pages. |
| [app/graphql/customer-account/CustomerSubscriptionsMutations.ts](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsMutations.ts) | Mutations for managing customer subscriptions. |
| [app/graphql/customer-account/CustomerSubscriptionsQuery.ts](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsQuery.ts) | Queries for managing customer subscriptions. |
| [app/routes/account.subscriptions.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/routes/account.subscriptions.tsx) | Subscriptions management page. |
| [app/styles/account-subscriptions.css](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/account-subscriptions.css) | Subscriptions management page styles. |
| [app/styles/selling-plan.css](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/selling-plan.css) | Styles the `SellingPlanSelector` component. |

## Steps

### Step 1: Set up the Shopify Subscriptions app

1. Install the [Shopify Subscriptions app](https://apps.shopify.com/shopify-subscriptions).
2. In your Shopify admin, [use the Subscriptions app](https://admin.shopify.com/apps/subscriptions-remix/app) to create one or more subscription plans.
3. On the [Products](https://admin.shopify.com/products) page, open any products that will be sold as subscriptions and add the relevant subscription plans in the **Purchase options** section.
The Hydrogen demo storefront comes pre-configured with an example subscription product with the handle `shopify-wax`.


### Step 2: Add ingredients to your project

Copy all the files found in the `ingredients/` directory into your project.

- [app/components/SellingPlanSelector.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/components/SellingPlanSelector.tsx)
- [app/graphql/customer-account/CustomerSubscriptionsMutations.ts](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsMutations.ts)
- [app/graphql/customer-account/CustomerSubscriptionsQuery.ts](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/graphql/customer-account/CustomerSubscriptionsQuery.ts)
- [app/routes/account.subscriptions.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/routes/account.subscriptions.tsx)
- [app/styles/account-subscriptions.css](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/account-subscriptions.css)
- [app/styles/selling-plan.css](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/cookbook/recipes/subscriptions/ingredients/templates/skeleton/app/styles/selling-plan.css)

### Step 3: Render the selling plan in the cart

1. Update `CartLineItem` to show subscription details when they're available.
2. Extract `sellingPlanAllocation` from cart line data, display the plan name, and standardize component import paths.


#### File: [app/components/CartLineItem.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/components/CartLineItem.tsx)

```diff
index bd33a2cf..a18e4b52 100644
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

### Step 4: Update ProductForm to support subscriptions

1. Add conditional rendering to display subscription options alongside the standard variant selectors.
2. Implement `SellingPlanSelector` and `SellingPlanGroup` components to handle subscription plan selection.
3. Update `AddToCartButton` to include selling plan data when subscriptions are selected.


#### File: [app/components/ProductForm.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/components/ProductForm.tsx)

<details>

```diff
index e8616a61..8b7fe8ca 100644
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

### Step 5: Update ProductPrice to display subscription pricing

1. Add a `SellingPlanPrice` function to calculate adjusted prices based on subscription plan type (fixed amount, fixed price, or percentage).
2. Add logic to handle different price adjustment types and render the appropriate subscription price when a selling plan is selected.


#### File: [app/components/ProductPrice.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/components/ProductPrice.tsx)

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

### Step 6: Add selling plan data to cart queries

Add a `sellingPlanAllocation` field with the plan name to the standard and componentizable cart line GraphQL fragments. This displays subscription details in the cart.


#### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/lib/fragments.ts)

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

### Step 7: Add SellingPlanSelector to product pages

1. Add the `SellingPlanSelector` component to display subscription options on product pages.
2. Add logic to handle pricing adjustments, maintain selection state using URL parameters, and update the add-to-cart functionality.
3. Fetch subscription data through the updated cart GraphQL fragments.


#### File: [app/routes/products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 2dc6bda2..3507d496 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -1,3 +1,5 @@
+import type {SellingPlanFragment} from 'storefrontapi.generated';
+import type {LinksFunction} from '@remix-run/node';
 import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {useLoaderData, type MetaFunction} from '@remix-run/react';
 import {
@@ -13,6 +15,12 @@ import {ProductImage} from '~/components/ProductImage';
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
@@ -63,8 +71,34 @@ async function loadCriticalData({
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
 
@@ -81,7 +115,7 @@ function loadDeferredData({context, params}: LoaderFunctionArgs) {
 }
 
 export default function Product() {
-  const {product} = useLoaderData<typeof loader>();
+  const {product, selectedSellingPlan} = useLoaderData<typeof loader>();
 
   // Optimistically selects a variant with given available variant information
   const selectedVariant = useOptimisticVariant(
@@ -99,7 +133,7 @@ export default function Product() {
     selectedOrFirstAvailableVariant: selectedVariant,
   });
 
-  const {title, descriptionHtml} = product;
+  const {title, descriptionHtml, sellingPlanGroups} = product;
 
   return (
     <div className="product">
@@ -109,11 +143,15 @@ export default function Product() {
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
@@ -177,9 +215,83 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
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
@@ -207,6 +319,11 @@ const PRODUCT_FRAGMENT = `#graphql
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
@@ -218,6 +335,7 @@ const PRODUCT_FRAGMENT = `#graphql
       title
     }
   }
+  ${SELLING_PLAN_GROUP_FRAGMENT}
   ${PRODUCT_VARIANT_FRAGMENT}
 ` as const;
```

</details>

### Step 8: Add a link to the Subscriptions page

Add a `Subscriptions` link to the account menu.


#### File: [app/routes/account.tsx](https://github.com/Shopify/hydrogen/blob/658f0c7ed75d10c0789d426a1dbc771e31a6c2a9/templates/skeleton/app/routes/account.tsx)

```diff
index 0941d4e0..976ae9df 100644
--- a/templates/skeleton/app/routes/account.tsx
+++ b/templates/skeleton/app/routes/account.tsx
@@ -74,6 +74,10 @@ function AccountMenu() {
         &nbsp; Addresses &nbsp;
       </NavLink>
       &nbsp;|&nbsp;
+      <NavLink to="/account/subscriptions" style={isActiveStyle}>
+        &nbsp; Subscriptions &nbsp;
+      </NavLink>
+      &nbsp;|&nbsp;
       <Logout />
     </nav>
   );
```