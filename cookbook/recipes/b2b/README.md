# 🧑‍🍳 B2B

This is an example implementation of a B2B storefront using Hydrogen. It includes the following high level changes.

1. Retrieving company location data from a logged in customer using the [Customer Account API](https://shopify.dev/docs/api/customer/2024-07/queries/customer)
2. Displaying a list of company locations and setting a `companyLocationId` in session
3. Using a storefront `customerAccessToken` and `companyLocationId` to update cart and get B2B specific rules and pricing such as [volume pricing and quantity rules](https://help.shopify.com/en/manual/b2b/catalogs/quantity-pricing)
4. Using a storefront `customerAccessToken` and `companyLocationId` to [contextualize queries](https://shopify.dev/docs/api/storefront#directives) using the `buyer` argument on the product display page

> [!NOTE]
> Only queries on the product display page, `app/routes/products.$handle.tsx`, were contextualized in this example. For a production storefront, all queries for product data should be contextualized.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/B2BLocationProvider.tsx`](ingredients/templates/skeleton/app/components/B2BLocationProvider.tsx) | Provides context on if the current logged in customer is a B2B customer and keeping track of the location modal open status. |
| [`app/components/B2BLocationSelector.tsx`](ingredients/templates/skeleton/app/components/B2BLocationSelector.tsx) | Component to choose a Company location to buy for. Rendered if there is no `companyLocationId` set in session. |
| [`app/components/PriceBreaks.tsx`](ingredients/templates/skeleton/app/components/PriceBreaks.tsx) | Component rendered on the product page to highlight quantity price breaks. |
| [`app/components/QuantityRules.tsx`](ingredients/templates/skeleton/app/components/QuantityRules.tsx) | Component rendered on the product page to highlight quantity rules. |
| [`app/graphql/customer-account/CustomerLocationsQuery.ts`](ingredients/templates/skeleton/app/graphql/customer-account/CustomerLocationsQuery.ts) | Customer query to fetch company locations. |
| [`app/routes/b2blocations.tsx`](ingredients/templates/skeleton/app/routes/b2blocations.tsx) | Route to set the company location in session. |

## 🍱 Steps

### 1. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/B2BLocationProvider.tsx`
- `app/components/B2BLocationSelector.tsx`
- `app/components/PriceBreaks.tsx`
- `app/components/QuantityRules.tsx`
- `app/graphql/customer-account/CustomerLocationsQuery.ts`
- `app/routes/b2blocations.tsx`

### 2. Requirements

- Your store is on a [Shopify Plus plan](https://help.shopify.com/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan).
- Your store is using [new customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts).
- You have access to a customer which has permission to order for a [B2B company](https://help.shopify.com/en/manual/b2b).

### 3. Product Form

- Add the quantity to the product form.
- Pass the quantity to the add to cart button.

#### File: [`app/components/ProductForm.tsx`](/templates/skeleton/app/components/ProductForm.tsx)

```diff
index e8616a61..33d1a7f8 100644
--- a/templates/skeleton/app/components/ProductForm.tsx
+++ b/templates/skeleton/app/components/ProductForm.tsx
@@ -11,9 +11,11 @@ import type {ProductFragment} from 'storefrontapi.generated';
 export function ProductForm({
   productOptions,
   selectedVariant,
+  quantity,
 }: {
   productOptions: MappedProductOptions[];
   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
+  quantity: number;
 }) {
   const navigate = useNavigate();
   const {open} = useAside();
@@ -111,7 +113,7 @@ export function ProductForm({
             ? [
                 {
                   merchandiseId: selectedVariant.id,
-                  quantity: 1,
+                  quantity,
                   selectedVariant,
                 },
               ]

```

### 4. Update variant fragment

- Add the quantity rule for the product variant.
- Add the quantity price breaks for the product variant.

#### File: [`app/lib/fragments.ts`](/templates/skeleton/app/lib/fragments.ts)

```diff
index dc4426a9..8c65de3d 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -102,6 +102,22 @@ export const CART_QUERY_FRAGMENT = `#graphql
           name
           value
         }
+
+        quantityRule {
+          maximum
+          minimum
+          increment
+        }
+
+        quantityPriceBreaks(first: 5) {
+          nodes {
+            minimumQuantity
+            price {
+              amount
+              currencyCode
+            }
+          }
+        }
       }
     }
   }

```

### 5. Add provider to the root

Wrap the page in a B2BLocationProvider to enable B2B features.

#### File: [`app/root.tsx`](/templates/skeleton/app/root.tsx)

<details>

```diff
index a4f7c673..2f34a0bc 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -16,6 +16,14 @@ import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
 import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
+import {
+  Company,
+  CompanyAddress,
+  CompanyLocation,
+  Maybe,
+} from '@shopify/hydrogen/customer-account-api-types';
+import {B2BLocationProvider} from './components/B2BLocationProvider';
+import {B2BLocationSelector} from './components/B2BLocationSelector';
 
 export type RootLoader = typeof loader;
 
@@ -65,6 +73,26 @@ export function links() {
   ];
 }
 
+export type CustomerCompanyLocation = Pick<CompanyLocation, 'name' | 'id'> & {
+  shippingAddress?:
+    | Maybe<Pick<CompanyAddress, 'countryCode' | 'formattedAddress'>>
+    | undefined;
+};
+
+export type CustomerCompanyLocationConnection = {
+  node: CustomerCompanyLocation;
+};
+
+export type CustomerCompany =
+  | Maybe<
+      Pick<Company, 'name' | 'id'> & {
+        locations: {
+          edges: CustomerCompanyLocationConnection[];
+        };
+      }
+    >
+  | undefined;
+
 export async function loader(args: LoaderFunctionArgs) {
   // Start fetching non-critical data without blocking time to first byte
   const deferredData = loadDeferredData(args);
@@ -162,7 +190,11 @@ export function Layout({children}: {children?: React.ReactNode}) {
             shop={data.shop}
             consent={data.consent}
           >
-            <PageLayout {...data}>{children}</PageLayout>
+            {
+            <B2BLocationProvider>
+              <PageLayout {...data}>{children}</PageLayout>
+              <B2BLocationSelector />
+            </B2BLocationProvider>
           </Analytics.Provider>
         ) : (
           children

```

</details>

### 6. Product page

- Get the buyer from the customer account.
- Add the buyer to the variables.
- Pass the buyer to the graphql query.
- Add the quantity rules to the product page.
- Add the quantity price breaks to the product page.
- Add the quantity rule for the product variant.
- Add the quantity price breaks for the product variant.
- Pass the buyer to the graphql query.

#### File: [`app/routes/products.$handle.tsx`](/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 0028b423..22f8b999 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -11,6 +11,8 @@ import {
 import {ProductPrice} from '~/components/ProductPrice';
 import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
+import {hasQuantityRules, QuantityRules} from '../components/QuantityRules';
+import {PriceBreaks} from '../components/PriceBreaks';
 
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [
@@ -22,12 +24,35 @@ export const meta: MetaFunction<typeof loader> = ({data}) => {
   ];
 };
 
+type BuyerVariables =
+  | {
+      buyer: {
+        companyLocationId: string;
+        customerAccessToken: string;
+      };
+    }
+  | {};
+
 export async function loader(args: LoaderFunctionArgs) {
+
+  const buyer = await args.context.customerAccount.getBuyer();
+
+
+  const buyerVariables: BuyerVariables =
+    buyer?.companyLocationId && buyer?.customerAccessToken
+      ? {
+          buyer: {
+            companyLocationId: buyer.companyLocationId,
+            customerAccessToken: buyer.customerAccessToken,
+          },
+        }
+      : {};
+
   // Start fetching non-critical data without blocking time to first byte
   const deferredData = loadDeferredData(args);
 
   // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+  const criticalData = await loadCriticalData(args, buyerVariables);
 
   return {...deferredData, ...criticalData};
 }
@@ -36,11 +61,10 @@ export async function loader(args: LoaderFunctionArgs) {
  * Load data necessary for rendering content above the fold. This is the critical data
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
-async function loadCriticalData({
-  context,
-  params,
-  request,
-}: LoaderFunctionArgs) {
+async function loadCriticalData(
+  {context, params, request}: LoaderFunctionArgs,
+  buyerVariables: BuyerVariables,
+) {
   const {handle} = params;
   const {storefront} = context;
 
@@ -50,7 +74,12 @@ async function loadCriticalData({
 
   const [{product}] = await Promise.all([
     storefront.query(PRODUCT_QUERY, {
-      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
+      variables: {
+        handle,
+        selectedOptions: getSelectedProductOptions(request),
+
+        ...buyerVariables,
+      },
     }),
     // Add other queries here, so that they are loaded in parallel
   ]);
@@ -110,8 +139,25 @@ export default function Product() {
         <ProductForm
           productOptions={productOptions}
           selectedVariant={selectedVariant}
+          quantity={selectedVariant?.quantityRule?.increment || 1}
         />
         <br />
+        {
+        {hasQuantityRules(selectedVariant?.quantityRule) ? (
+          <QuantityRules
+            maximum={selectedVariant?.quantityRule.maximum}
+            minimum={selectedVariant?.quantityRule.minimum}
+            increment={selectedVariant?.quantityRule.increment}
+          />
+        ) : null}
+        <br />
+        {
+        {selectedVariant?.quantityPriceBreaks?.nodes &&
+        selectedVariant?.quantityPriceBreaks?.nodes?.length > 0 ? (
+          <PriceBreaks
+            priceBreaks={selectedVariant?.quantityPriceBreaks?.nodes}
+          />
+        ) : null}
         <br />
         <p>
           <strong>Description</strong>
@@ -167,6 +213,22 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
       name
       value
     }
+
+    quantityRule {
+      maximum
+      minimum
+      increment
+    }
+
+    quantityPriceBreaks(first: 5) {
+      nodes {
+        minimumQuantity
+        price {
+          amount
+          currencyCode
+        }
+      }
+    }
     sku
     title
     unitPrice {
@@ -220,10 +282,12 @@ const PRODUCT_FRAGMENT = `#graphql
 const PRODUCT_QUERY = `#graphql
   query Product(
     $country: CountryCode
+
+    $buyer: BuyerInput
     $handle: String!
     $language: LanguageCode
     $selectedOptions: [SelectedOptionInput!]!
-  ) @inContext(country: $country, language: $language) {
+  ) @inContext(country: $country, language: $language, buyer: $buyer) {
     product(handle: $handle) {
       ...Product
     }

```

</details>

### 7. Codegen



#### File: [`customer-accountapi.generated.d.ts`](/templates/skeleton/customer-accountapi.generated.d.ts)

<details>

```diff
index fdc2997a..d2eda8b7 100644
--- a/templates/skeleton/customer-accountapi.generated.d.ts
+++ b/templates/skeleton/customer-accountapi.generated.d.ts
@@ -172,6 +172,43 @@ export type CustomerDetailsQuery = {
   };
 };
 
+export type CustomerLocationsQueryVariables = CustomerAccountAPI.Exact<{
+  [key: string]: never;
+}>;
+
+export type CustomerLocationsQuery = {
+  customer: Pick<CustomerAccountAPI.Customer, 'id'> & {
+    emailAddress?: CustomerAccountAPI.Maybe<
+      Pick<CustomerAccountAPI.CustomerEmailAddress, 'emailAddress'>
+    >;
+    companyContacts: {
+      edges: Array<{
+        node: {
+          company?: CustomerAccountAPI.Maybe<
+            Pick<CustomerAccountAPI.Company, 'id' | 'name'> & {
+              locations: {
+                edges: Array<{
+                  node: Pick<
+                    CustomerAccountAPI.CompanyLocation,
+                    'id' | 'name'
+                  > & {
+                    shippingAddress?: CustomerAccountAPI.Maybe<
+                      Pick<
+                        CustomerAccountAPI.CompanyAddress,
+                        'countryCode' | 'formattedAddress'
+                      >
+                    >;
+                  };
+                }>;
+              };
+            }
+          >;
+        };
+      }>;
+    };
+  };
+};
+
 export type OrderMoneyFragment = Pick<
   CustomerAccountAPI.MoneyV2,
   'amount' | 'currencyCode'
@@ -474,6 +511,10 @@ interface GeneratedQueryTypes {
     return: CustomerDetailsQuery;
     variables: CustomerDetailsQueryVariables;
   };
+  '#graphql\n  query CustomerLocations {\n    customer {\n      id\n      emailAddress {\n        emailAddress\n      }\n      companyContacts(first: 1){\n        edges{\n          node{\n            company{\n              id\n              name\n              locations(first: 10){\n                edges{\n                  node{\n                    id\n                    name\n                    shippingAddress {\n                      countryCode\n                      formattedAddress\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
+    return: CustomerLocationsQuery;
+    variables: CustomerLocationsQueryVariables;
+  };
   '#graphql\n  fragment OrderMoney on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      __typename\n      ... on MoneyV2 {\n        ...OrderMoney\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment OrderLineItemFull on LineItem {\n    id\n    title\n    quantity\n    price {\n      ...OrderMoney\n    }\n    discountAllocations {\n      allocatedAmount {\n        ...OrderMoney\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    totalDiscount {\n      ...OrderMoney\n    }\n    image {\n      altText\n      height\n      url\n      id\n      width\n    }\n    variantTitle\n  }\n  fragment Order on Order {\n    id\n    name\n    statusPageUrl\n    processedAt\n    fulfillments(first: 1) {\n      nodes {\n        status\n      }\n    }\n    totalTax {\n      ...OrderMoney\n    }\n    totalPrice {\n      ...OrderMoney\n    }\n    subtotal {\n      ...OrderMoney\n    }\n    shippingAddress {\n      name\n      formatted(withName: true)\n      formattedArea\n    }\n    discountApplications(first: 100) {\n      nodes {\n        ...DiscountApplication\n      }\n    }\n    lineItems(first: 100) {\n      nodes {\n        ...OrderLineItemFull\n      }\n    }\n  }\n  query Order($orderId: ID!) {\n    order(id: $orderId) {\n      ... on Order {\n        ...Order\n      }\n    }\n  }\n': {
     return: OrderQuery;
     variables: OrderQueryVariables;

```

</details>

#### File: [`storefrontapi.generated.d.ts`](/templates/skeleton/storefrontapi.generated.d.ts)

<details>

```diff
index d27c5942..afd39624 100644
--- a/templates/skeleton/storefrontapi.generated.d.ts
+++ b/templates/skeleton/storefrontapi.generated.d.ts
@@ -65,6 +65,17 @@ export type CartLineComponentFragment = Pick<
     selectedOptions: Array<
       Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
     >;
+    quantityRule: Pick<
+      StorefrontAPI.QuantityRule,
+      'maximum' | 'minimum' | 'increment'
+    >;
+    quantityPriceBreaks: {
+      nodes: Array<
+        Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+        }
+      >;
+    };
   };
 };
 
@@ -158,6 +169,17 @@ export type CartApiQueryFragment = Pick<
             selectedOptions: Array<
               Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
             >;
+            quantityRule: Pick<
+              StorefrontAPI.QuantityRule,
+              'maximum' | 'minimum' | 'increment'
+            >;
+            quantityPriceBreaks: {
+              nodes: Array<
+                Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+                }
+              >;
+            };
           };
         })
     >;
@@ -722,6 +744,17 @@ export type ProductVariantFragment = Pick<
   price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
   product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
   selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
+  quantityRule: Pick<
+    StorefrontAPI.QuantityRule,
+    'maximum' | 'minimum' | 'increment'
+  >;
+  quantityPriceBreaks: {
+    nodes: Array<
+      Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+      }
+    >;
+  };
   unitPrice?: StorefrontAPI.Maybe<
     Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
   >;
@@ -761,6 +794,20 @@ export type ProductFragment = Pick<
               selectedOptions: Array<
                 Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
               >;
+              quantityRule: Pick<
+                StorefrontAPI.QuantityRule,
+                'maximum' | 'minimum' | 'increment'
+              >;
+              quantityPriceBreaks: {
+                nodes: Array<
+                  Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+                    price: Pick<
+                      StorefrontAPI.MoneyV2,
+                      'amount' | 'currencyCode'
+                    >;
+                  }
+                >;
+              };
               unitPrice?: StorefrontAPI.Maybe<
                 Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
               >;
@@ -798,6 +845,17 @@ export type ProductFragment = Pick<
       selectedOptions: Array<
         Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
       >;
+      quantityRule: Pick<
+        StorefrontAPI.QuantityRule,
+        'maximum' | 'minimum' | 'increment'
+      >;
+      quantityPriceBreaks: {
+        nodes: Array<
+          Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+          }
+        >;
+      };
       unitPrice?: StorefrontAPI.Maybe<
         Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
       >;
@@ -822,6 +880,17 @@ export type ProductFragment = Pick<
       selectedOptions: Array<
         Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
       >;
+      quantityRule: Pick<
+        StorefrontAPI.QuantityRule,
+        'maximum' | 'minimum' | 'increment'
+      >;
+      quantityPriceBreaks: {
+        nodes: Array<
+          Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+          }
+        >;
+      };
       unitPrice?: StorefrontAPI.Maybe<
         Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
       >;
@@ -832,6 +901,7 @@ export type ProductFragment = Pick<
 
 export type ProductQueryVariables = StorefrontAPI.Exact<{
   country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  buyer?: StorefrontAPI.InputMaybe<StorefrontAPI.BuyerInput>;
   handle: StorefrontAPI.Scalars['String']['input'];
   language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
   selectedOptions:
@@ -875,6 +945,23 @@ export type ProductQuery = {
                   selectedOptions: Array<
                     Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                   >;
+                  quantityRule: Pick<
+                    StorefrontAPI.QuantityRule,
+                    'maximum' | 'minimum' | 'increment'
+                  >;
+                  quantityPriceBreaks: {
+                    nodes: Array<
+                      Pick<
+                        StorefrontAPI.QuantityPriceBreak,
+                        'minimumQuantity'
+                      > & {
+                        price: Pick<
+                          StorefrontAPI.MoneyV2,
+                          'amount' | 'currencyCode'
+                        >;
+                      }
+                    >;
+                  };
                   unitPrice?: StorefrontAPI.Maybe<
                     Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                   >;
@@ -912,6 +999,17 @@ export type ProductQuery = {
           selectedOptions: Array<
             Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
           >;
+          quantityRule: Pick<
+            StorefrontAPI.QuantityRule,
+            'maximum' | 'minimum' | 'increment'
+          >;
+          quantityPriceBreaks: {
+            nodes: Array<
+              Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+              }
+            >;
+          };
           unitPrice?: StorefrontAPI.Maybe<
             Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
           >;
@@ -936,6 +1034,17 @@ export type ProductQuery = {
           selectedOptions: Array<
             Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
           >;
+          quantityRule: Pick<
+            StorefrontAPI.QuantityRule,
+            'maximum' | 'minimum' | 'increment'
+          >;
+          quantityPriceBreaks: {
+            nodes: Array<
+              Pick<StorefrontAPI.QuantityPriceBreak, 'minimumQuantity'> & {
+                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+              }
+            >;
+          };
           unitPrice?: StorefrontAPI.Maybe<
             Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
           >;
@@ -1221,7 +1330,7 @@ interface GeneratedQueryTypes {
     return: PoliciesQuery;
     variables: PoliciesQueryVariables;
   };
-  '#graphql\n  query Product(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...Product\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    encodedVariantExistence\n    encodedVariantAvailability\n    options {\n      name\n      optionValues {\n        name\n        firstSelectableVariant {\n          ...ProductVariant\n        }\n        swatch {\n          color\n          image {\n            previewImage {\n              url\n            }\n          }\n        }\n      }\n    }\n    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n      ...ProductVariant\n    }\n    adjacentVariants (selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    seo {\n      description\n      title\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n': {
+  '#graphql\n  query Product(\n    $country: CountryCode\n    $buyer: BuyerInput\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language, buyer: $buyer) {\n    product(handle: $handle) {\n      ...Product\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    encodedVariantExistence\n    encodedVariantAvailability\n    options {\n      name\n      optionValues {\n        name\n        firstSelectableVariant {\n          ...ProductVariant\n        }\n        swatch {\n          color\n          image {\n            previewImage {\n              url\n            }\n          }\n        }\n      }\n    }\n    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n      ...ProductVariant\n    }\n    adjacentVariants (selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    seo {\n      description\n      title\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    quantityRule {\n      maximum\n      minimum\n      increment\n    }\n    quantityPriceBreaks(first: 5) {\n      nodes {\n        minimumQuantity\n        price {\n          amount\n          currencyCode\n        }\n      }\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n': {
     return: ProductQuery;
     variables: ProductQueryVariables;
   };

```

</details>