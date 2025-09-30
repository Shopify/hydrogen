# B2B Commerce

This recipe adds comprehensive B2B functionality to your Hydrogen storefront, enabling business customers to:

- Select their company location for contextualized pricing
- View and respect quantity rules (minimum, maximum, increment)
- See volume-based price breaks for bulk purchases
- Access B2B-specific pricing through contextualized GraphQL queries

The implementation includes a location selector modal, quantity rule displays on product pages, 
and cart functionality that respects B2B quantity rules. All product queries are contextualized 
with buyer information (company location + customer token) to ensure accurate B2B pricing.

> [!NOTE]
> This recipe requires a Shopify Plus plan for B2B functionality

> [!NOTE]
> Your store must use new customer accounts (not classic accounts)

> [!NOTE]
> Only the product display page uses contextualized queries in this example

> [!NOTE]
> For production, all product queries should be contextualized with buyer information

> [!NOTE]
> The location selector appears automatically for customers with multiple company locations

## Requirements

- Shopify Plus plan with B2B enabled
- New customer accounts activated
- At least one B2B company with customer access configured
- Products with quantity rules or volume pricing configured (optional but recommended for testing)

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/B2BLocationProvider.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/B2BLocationProvider.tsx) |  |
| [app/components/B2BLocationSelector.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/B2BLocationSelector.tsx) |  |
| [app/components/PriceBreaks.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/PriceBreaks.tsx) |  |
| [app/components/QuantityRules.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/QuantityRules.tsx) |  |
| [app/graphql/customer-account/CustomerLocationsQuery.ts](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/graphql/customer-account/CustomerLocationsQuery.ts) |  |
| [app/routes/b2blocations.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/routes/b2blocations.tsx) |  |

## Steps

### Step 1: README.md



#### File: [README.md](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/README.md)

```diff
index c584e537..e3231cba 100644
--- a/templates/skeleton/README.md
+++ b/templates/skeleton/README.md
@@ -18,6 +18,45 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - TypeScript and JavaScript flavors
 - Minimal setup of components and routes
 
+## B2B Features
+
+This template includes B2B (Business-to-Business) functionality for stores on Shopify Plus plans:
+
+### What's included:
+
+1. **Company Location Selection**: Allows B2B customers to select their company location for contextualized pricing and rules
+2. **Quantity Rules**: Display and enforce minimum, maximum, and increment quantity rules for B2B products
+3. **Volume Pricing**: Show quantity-based price breaks for bulk purchases
+4. **Contextualized Queries**: Product queries use buyer context (company location + customer token) for accurate B2B pricing
+
+### B2B Requirements:
+
+- Your store must be on a [Shopify Plus plan](https://help.shopify.com/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan)
+- Your store must use [new customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts)
+- You need a customer with permission to order for a [B2B company](https://help.shopify.com/en/manual/b2b)
+
+### Key B2B Files:
+
+| File | Description |
+| --- | --- |
+| `app/routes/b2blocations.tsx` | Handles B2B location selection and session management |
+| `app/components/B2BLocationProvider.tsx` | React context provider for B2B location state |
+| `app/components/B2BLocationSelector.tsx` | Modal component for choosing company location |
+| `app/components/PriceBreaks.tsx` | Displays volume-based pricing tiers |
+| `app/components/QuantityRules.tsx` | Shows quantity rules (min/max/increment) |
+| `app/graphql/customer-account/CustomerLocationsQuery.ts` | GraphQL query for fetching company locations |
+
+### How it works:
+
+1. When a B2B customer logs in, the system retrieves their company location data using the Customer Account API
+2. If the customer has access to multiple locations, they can select one via the location selector
+3. The selected location ID is stored in the session and used to contextualize all product queries
+4. Products display B2B-specific information like quantity rules and volume pricing
+5. Cart operations respect B2B quantity rules and pricing
+
+> [!NOTE]
+> In this implementation, only the product display page (`app/routes/products.$handle.tsx`) uses contextualized queries. For production, all product queries should be contextualized with buyer information.
+
 ## Getting started
 
 **Requirements:**
```

### Step 2: app/components/B2BLocationProvider.tsx



#### File: [B2BLocationProvider.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/B2BLocationProvider.tsx)

<details>

```tsx
import {createContext, useContext, useEffect, useState, useMemo} from 'react';
import {useFetcher} from 'react-router';
import {type CustomerCompany} from '~/root';

export type B2BLocationContextValue = {
  company?: CustomerCompany;
  companyLocationId?: string;
  modalOpen?: boolean;
  setModalOpen: (b: boolean) => void;
};

const defaultB2BLocationContextValue = {
  company: undefined,
  companyLocationId: undefined,
  modalOpen: undefined,
  setModalOpen: () => {},
};

const B2BLocationContext = createContext<B2BLocationContextValue>(
  defaultB2BLocationContextValue,
);

export function B2BLocationProvider({children}: {children: React.ReactNode}) {
  const fetcher = useFetcher<B2BLocationContextValue>();
  const [modalOpen, setModalOpen] = useState(fetcher?.data?.modalOpen);

  useEffect(() => {
    if (fetcher.data || fetcher.state === 'loading') return;

    void fetcher.load('/b2blocations');
  }, [fetcher]);

  const value = useMemo<B2BLocationContextValue>(() => {
    return {
      ...defaultB2BLocationContextValue,
      ...fetcher.data,
      modalOpen: modalOpen ?? fetcher?.data?.modalOpen,
      setModalOpen,
    };
  }, [fetcher, modalOpen]);

  return (
    <B2BLocationContext.Provider value={value}>
      {children}
    </B2BLocationContext.Provider>
  );
}

export function useB2BLocation(): B2BLocationContextValue {
  return useContext(B2BLocationContext);
}
```

</details>

### Step 3: app/components/CartLineItem.tsx



#### File: [app/components/CartLineItem.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/components/CartLineItem.tsx)

```diff
index 80e34be2..1d09318c 100644
--- a/templates/skeleton/app/components/CartLineItem.tsx
+++ b/templates/skeleton/app/components/CartLineItem.tsx
@@ -76,8 +76,13 @@ export function CartLineItem({
 function CartLineQuantity({line}: {line: CartLine}) {
   if (!line || typeof line?.quantity === 'undefined') return null;
   const {id: lineId, quantity, isOptimistic} = line;
-  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
-  const nextQuantity = Number((quantity + 1).toFixed(0));
+  // @description Calculate quantity changes based on B2B quantity rules
+  const {increment, minimum, maximum} = line.merchandise.quantityRule || {increment: 1, minimum: 1, maximum: null};
+  const nextIncrement = increment - (quantity % increment);
+  const prevIncrement =
+    quantity % increment === 0 ? increment : quantity % increment;
+  const prevQuantity = Number(Math.max(0, quantity - prevIncrement).toFixed(0));
+  const nextQuantity = Number((quantity + nextIncrement).toFixed(0));
 
   return (
     <div className="cart-line-quantity">
@@ -85,7 +90,7 @@ function CartLineQuantity({line}: {line: CartLine}) {
       <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
         <button
           aria-label="Decrease quantity"
-          disabled={quantity <= 1 || !!isOptimistic}
+          disabled={prevQuantity < minimum || !!isOptimistic}
           name="decrease-quantity"
           value={prevQuantity}
         >
@@ -98,7 +103,9 @@ function CartLineQuantity({line}: {line: CartLine}) {
           aria-label="Increase quantity"
           name="increase-quantity"
           value={nextQuantity}
-          disabled={!!isOptimistic}
+          disabled={Boolean(
+            (maximum && nextQuantity > maximum) || !!isOptimistic,
+          )}
         >
           <span>&#43;</span>
         </button>
```

### Step 4: app/components/B2BLocationSelector.tsx



#### File: [B2BLocationSelector.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/B2BLocationSelector.tsx)

<details>

```tsx
import {CartForm} from '@shopify/hydrogen';
import type {
  CustomerCompanyLocation,
  CustomerCompanyLocationConnection,
} from '~/root';
import {useB2BLocation} from '~/components/B2BLocationProvider';

export function B2BLocationSelector() {
  const {company, modalOpen, setModalOpen} = useB2BLocation();

  const locations = company?.locations?.edges
    ? company.locations.edges.map(
        (location: CustomerCompanyLocationConnection) => {
          return {...location.node};
        },
      )
    : [];

  if (!company || !modalOpen)
    return <p>No company found for logged in user.</p>;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Logged in for {company.name}</h2>
        <legend>Choose a location:</legend>
        <div className="location-list">
          {locations.map((location: CustomerCompanyLocation) => {
            const addressLines =
              location?.shippingAddress?.formattedAddress ?? [];
            return (
              <CartForm
                key={location.id}
                route="/cart"
                action={CartForm.ACTIONS.BuyerIdentityUpdate}
                inputs={{
                  buyerIdentity: {companyLocationId: location.id},
                }}
              >
                {(fetcher) => (
                  <div>
                    <button
                      aria-label={`Select B2B location: ${location.name}`}
                      onClick={(event) => {
                        setModalOpen(false);
                        fetcher.submit(event.currentTarget.form, {
                          method: 'POST',
                        });
                      }}
                      className="location-item"
                    >
                      <div>
                        <p>
                          <strong>{location.name}</strong>
                        </p>
                        {addressLines.map((line: string) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </button>
                  </div>
                )}
              </CartForm>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

</details>

### Step 5: app/components/Header.tsx



#### File: [app/components/Header.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/components/Header.tsx)

<details>

```diff
index 45b620b4..12f7f165 100644
--- a/templates/skeleton/app/components/Header.tsx
+++ b/templates/skeleton/app/components/Header.tsx
@@ -7,6 +7,9 @@ import {
 } from '@shopify/hydrogen';
 import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
+// @description Import B2B types and hooks for company location management
+import {type CustomerCompanyLocationConnection} from '~/root';
+import {useB2BLocation} from './B2BLocationProvider';
 
 interface HeaderProps {
   header: HeaderQuery;
@@ -91,6 +94,8 @@ export function HeaderMenu({
           </NavLink>
         );
       })}
+      {/* @description Add B2B location selector to header navigation */}
+      <ChangeLocation />
     </nav>
   );
 }
@@ -175,6 +180,29 @@ function CartBanner() {
   return <CartBadge count={cart?.totalQuantity ?? 0} />;
 }
 
+// @description Add B2B location change button for company location selection
+function ChangeLocation() {
+  const {company, companyLocationId, setModalOpen} = useB2BLocation();
+
+  const locations = company?.locations?.edges
+    ? company.locations.edges.map(
+        (location: CustomerCompanyLocationConnection) => {
+          return {...location.node};
+        },
+      )
+    : [];
+
+  if (locations.length <= 1 || !company) return null;
+
+  return (
+    <button onClick={() => setModalOpen(true)}>
+      {locations.find(
+        (companyLocation) => companyLocation.id == companyLocationId,
+      )?.name || 'Select Location'}
+    </button>
+  );
+}
+
 const FALLBACK_HEADER_MENU = {
   id: 'gid://shopify/Menu/199655587896',
   items: [
```

</details>

### Step 6: app/components/PriceBreaks.tsx



#### File: [PriceBreaks.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/PriceBreaks.tsx)

<details>

```tsx
import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

type PriceBreak = {
  minimumQuantity: number;
  price: MoneyV2;
};

export type PriceBreaksProps = {
  priceBreaks: PriceBreak[];
};

export function PriceBreaks({priceBreaks}: PriceBreaksProps) {
  return (
    <>
      <h4>Volume Pricing</h4>
      <table className="rule-table">
        <thead>
          <tr>
            <th className="table-haeading">Minimum Quantity</th>
            <th className="table-haeading">Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {priceBreaks.map((priceBreak, index) => {
            return (
              <tr key={`price-break-${priceBreak.minimumQuantity}`}>
                <th className="table-item">{priceBreak.minimumQuantity}</th>
                <th className="table-item">
                  <Money data={priceBreak.price} />
                </th>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
```

</details>

### Step 7: app/components/ProductForm.tsx



#### File: [app/components/ProductForm.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/components/ProductForm.tsx)

```diff
index 47c8f305..5e3ec2c1 100644
--- a/templates/skeleton/app/components/ProductForm.tsx
+++ b/templates/skeleton/app/components/ProductForm.tsx
@@ -8,12 +8,15 @@ import {AddToCartButton} from './AddToCartButton';
 import {useAside} from './Aside';
 import type {ProductFragment} from 'storefrontapi.generated';
 
+// @description Add quantity parameter for B2B quantity support
 export function ProductForm({
   productOptions,
   selectedVariant,
+  quantity,
 }: {
   productOptions: MappedProductOptions[];
   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
+  quantity?: number;
 }) {
   const navigate = useNavigate();
   const {open} = useAside();
@@ -111,7 +114,8 @@ export function ProductForm({
             ? [
                 {
                   merchandiseId: selectedVariant.id,
-                  quantity: 1,
+                  // @description Use B2B quantity or default to 1
+                  quantity: quantity || 1,
                   selectedVariant,
                 },
               ]
```

### Step 8: app/components/QuantityRules.tsx



#### File: [QuantityRules.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/components/QuantityRules.tsx)

<details>

```tsx
import type {Maybe} from '@shopify/hydrogen/customer-account-api-types';

export type QuantityRulesProps = {
  maximum?: Maybe<number> | undefined;
  minimum?: Maybe<number> | undefined;
  increment?: Maybe<number> | undefined;
};

export const hasQuantityRules = (quantityRule?: QuantityRulesProps) => {
  return (
    quantityRule &&
    (quantityRule?.increment != 1 ||
      quantityRule?.minimum != 1 ||
      quantityRule?.maximum)
  );
};

export function QuantityRules({
  maximum,
  minimum,
  increment,
}: QuantityRulesProps) {
  return (
    <>
      <h4>Quantity Rules</h4>
      <table className="rule-table">
        <thead>
          <tr>
            <th className="table-haeading">Increment</th>
            <th className="table-haeading">Minimum</th>
            <th className="table-haeading">Maximum</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="table-item">{increment}</th>
            <th className="table-item">{minimum}</th>
            <th className="table-item">{maximum}</th>
          </tr>
        </tbody>
      </table>
    </>
  );
}
```

</details>

### Step 9: app/lib/fragments.ts



#### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/lib/fragments.ts)

```diff
index cf35c25e..6866c19a 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -52,6 +52,21 @@ export const CART_QUERY_FRAGMENT = `#graphql
           name
           value
         }
+        # @description Add B2B quantity rules and price breaks
+        quantityRule {
+          maximum
+          minimum
+          increment
+        }
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
@@ -102,6 +117,21 @@ export const CART_QUERY_FRAGMENT = `#graphql
           name
           value
         }
+        # @description Add B2B quantity rules and price breaks for cart line component
+        quantityRule {
+          maximum
+          minimum
+          increment
+        }
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

### Step 10: app/graphql/customer-account/CustomerLocationsQuery.ts



#### File: [CustomerLocationsQuery.ts](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/graphql/customer-account/CustomerLocationsQuery.ts)

<details>

```ts
// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Customer
export const CUSTOMER_LOCATIONS_QUERY = `#graphql
  query CustomerLocations {
    customer {
      id
      emailAddress {
        emailAddress
      }
      companyContacts(first: 1){
        edges{
          node{
            company{
              id
              name
              locations(first: 10){
                edges{
                  node{
                    id
                    name
                    shippingAddress {
                      countryCode
                      formattedAddress
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;
```

</details>

### Step 11: app/root.tsx



#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/root.tsx)

<details>

```diff
index df87425c..5a0fef09 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -16,9 +16,39 @@ import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from './components/PageLayout';
+// @description Import B2B components and types for company location management
+import {B2BLocationProvider} from '~/components/B2BLocationProvider';
+import {B2BLocationSelector} from '~/components/B2BLocationSelector';
+import type {
+  Company,
+  CompanyAddress,
+  CompanyLocation,
+  Maybe,
+} from '@shopify/hydrogen/customer-account-api-types';
 
 export type RootLoader = typeof loader;
 
+// @description Define B2B customer company types
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
 /**
  * This is important to avoid re-fetching root queries on sub-navigations
  */
@@ -176,9 +206,13 @@ export default function App() {
       shop={data.shop}
       consent={data.consent}
     >
-      <PageLayout {...data}>
-        <Outlet />
-      </PageLayout>
+      {/* @description Wrap PageLayout with B2B location provider for company location management */}
+      <B2BLocationProvider>
+        <PageLayout {...data}>
+          <Outlet />
+        </PageLayout>
+        <B2BLocationSelector />
+      </B2BLocationProvider>
     </Analytics.Provider>
   );
 }
```

</details>

### Step 12: app/routes/b2blocations.tsx



#### File: [b2blocations.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/b2b/ingredients/templates/skeleton/app/routes/b2blocations.tsx)

<details>

```tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/b2blocations';
import {B2BLocationSelector} from '../components/B2BLocationSelector';
import {CUSTOMER_LOCATIONS_QUERY} from '~/graphql/customer-account/CustomerLocationsQuery';

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;

  const buyer = await customerAccount.getBuyer();

  let companyLocationId = buyer?.companyLocationId || null;
  let company = null;

  // Check if logged in customer is a b2b customer
  if (buyer) {
    const customer = await customerAccount.query(CUSTOMER_LOCATIONS_QUERY);
    company =
      customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company ||
      null;
  }

  // If there is only 1 company location, set it in session
  if (!companyLocationId && company?.locations?.edges?.length === 1) {
    companyLocationId = company.locations.edges[0].node.id;

    customerAccount.setBuyer({
      companyLocationId,
    });
  }

  const modalOpen = Boolean(company) && !companyLocationId;

  return {company, companyLocationId, modalOpen};
}

export default function CartRoute() {
  return <B2BLocationSelector />;
}
```

</details>

### Step 13: app/routes/account_.logout.tsx



#### File: [app/routes/account_.logout.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/routes/account_.logout.tsx)

```diff
index 5e67cc85..6d331155 100644
--- a/templates/skeleton/app/routes/account_.logout.tsx
+++ b/templates/skeleton/app/routes/account_.logout.tsx
@@ -7,5 +7,10 @@ export async function loader() {
 }
 
 export async function action({context}: Route.ActionArgs) {
+  // @description Clear B2B company location on logout
+  await context.cart.updateBuyerIdentity({
+    companyLocationId: null,
+    customerAccessToken: null,
+  });
   return context.customerAccount.logout();
 }
```

### Step 14: app/routes/products.$handle.tsx



#### File: [app/routes/products.$handle.tsx](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/templates/skeleton/app/routes/products.$handle.tsx)

<details>

```diff
index 422a2eb9..f05fd79c 100644
--- a/templates/skeleton/app/routes/products.$handle.tsx
+++ b/templates/skeleton/app/routes/products.$handle.tsx
@@ -15,6 +15,19 @@ import {ProductPrice} from '~/components/ProductPrice';
 import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
 import {redirectIfHandleIsLocalized} from '~/lib/redirect';
+// @description Import B2B components for quantity rules and price breaks
+import {QuantityRules, hasQuantityRules} from '~/components/QuantityRules';
+import {PriceBreaks} from '~/components/PriceBreaks';
+
+// @description Define B2B buyer variables type for contextualized queries
+type BuyerVariables =
+  | {
+      buyer: {
+        companyLocationId: string;
+        customerAccessToken: string;
+      };
+    }
+  | {};
 
 export const meta: Route.MetaFunction = ({data}) => {
   return [
@@ -27,11 +40,24 @@ export const meta: Route.MetaFunction = ({data}) => {
 };
 
 export async function loader(args: Route.LoaderArgs) {
+  // @description Get B2B buyer context for contextualized product queries
+  const buyer = await args.context.customerAccount.getBuyer();
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
-  const deferredData = loadDeferredData(args);
+  const deferredData = loadDeferredData({...args, buyerVariables});
 
   // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+  const criticalData = await loadCriticalData({...args, buyerVariables});
 
   return {...deferredData, ...criticalData};
 }
@@ -44,7 +70,8 @@ async function loadCriticalData({
   context,
   params,
   request,
-}: Route.LoaderArgs) {
+  buyerVariables,
+}: Route.LoaderArgs & {buyerVariables: BuyerVariables}) {
   const {handle} = params;
   const {storefront} = context;
 
@@ -54,7 +81,7 @@ async function loadCriticalData({
 
   const [{product}] = await Promise.all([
     storefront.query(PRODUCT_QUERY, {
-      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
+      variables: {handle, selectedOptions: getSelectedProductOptions(request), ...buyerVariables},
     }),
     // Add other queries here, so that they are loaded in parallel
   ]);
@@ -76,7 +103,7 @@ async function loadCriticalData({
  * fetched after the initial page load. If it's unavailable, the page should still 200.
  * Make sure to not throw any errors here, as it will cause the page to 500.
  */
-function loadDeferredData({context, params}: Route.LoaderArgs) {
+function loadDeferredData({context, params, buyerVariables}: Route.LoaderArgs & {buyerVariables: BuyerVariables}) {
   // Put any API calls that is not critical to be available on first page render
   // For example: product reviews, product recommendations, social feeds.
 
@@ -117,8 +144,26 @@ export default function Product() {
         <ProductForm
           productOptions={productOptions}
           selectedVariant={selectedVariant}
+          // @description Pass B2B quantity increment or default to 1
+          quantity={selectedVariant?.quantityRule?.increment || 1}
         />
         <br />
+        {/* @description Display B2B quantity rules if they exist */}
+        {hasQuantityRules(selectedVariant?.quantityRule) ? (
+          <QuantityRules
+            maximum={selectedVariant?.quantityRule.maximum}
+            minimum={selectedVariant?.quantityRule.minimum}
+            increment={selectedVariant?.quantityRule.increment}
+          />
+        ) : null}
+        <br />
+        {/* @description Display B2B price breaks if they exist */}
+        {selectedVariant?.quantityPriceBreaks?.nodes &&
+        selectedVariant?.quantityPriceBreaks?.nodes?.length > 0 ? (
+          <PriceBreaks
+            priceBreaks={selectedVariant?.quantityPriceBreaks?.nodes}
+          />
+        ) : null}
         <br />
         <p>
           <strong>Description</strong>
@@ -174,6 +219,21 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
       name
       value
     }
+    # @description Add B2B quantity rules and price breaks to variant fragment
+    quantityRule {
+      maximum
+      minimum
+      increment
+    }
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
@@ -224,13 +284,15 @@ const PRODUCT_FRAGMENT = `#graphql
   ${PRODUCT_VARIANT_FRAGMENT}
 ` as const;
 
+// @description Add buyer parameter for B2B contextualized queries
 const PRODUCT_QUERY = `#graphql
   query Product(
     $country: CountryCode
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