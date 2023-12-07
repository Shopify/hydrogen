# Hydrogen example: Subscriptions / Selling Plans

This folder contains an example implementation of [subscriptions](https://shopify.dev/docs/apps/selling-strategies/subscriptions) for Hydrogen. It shows how to display selling plans on a product page.

![subscribtion-example](https://github.com/Shopify/hydrogen/assets/12080141/13afebb6-7fb8-408a-bf29-c35cc0d80ef2)

## Requirements

This example is connected to the `hydrogen-preview` storefront which contains one example subscription product (`shopify-wax`).

To run this example on your own store, you'll need to:

- Install a [subscription app](https://apps.shopify.com/categories/selling-products-purchase-options-subscriptions).
- Use the subscription app to create a selling plan for a product.

## Key files

This folder contains the minimal set of files needed to showcase the implementation.

| File                                                                                  | Description                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`.env.example`](.env)                                                                | Environment variable file. This project is connected to the `hydrogen-preview` storefront which has one example subscription product (`shopify-wax`). |
| [`server.ts`](server.ts)                                                              | Application entry point modified to fetch selected selling plans from cart lines.                                                                     |
| 🆕 [`app/components/SellingPlanSelector.tsx`](app/components/SellingPlanSelector.tsx) | A component that simplifies selecting sellingPlans subscription options                                                                               |
| [`app/routes/product.$handle.tsx`](app/routes/product.$handle.tsx)                    | Product page modified to display subscription options.                                                                                                |
| [`app/components/Cart.tsx`](app/components/Cart.tsx)                                  | Cart component modified to display selected subscription.                                                                                             |

## Instructions

### 1. Copy over the new files

- In your Hydrogen app, create the new files from the file list above, copying in the code as you go.
- If you already have a `.env` file, ensure the key-value pairs from `.env.example` are present

### 2. Adjust the cart query in `server.ts`

Edit the CART_QUERY_FRAGMENT `CartLine` fragment and include [sellingPlanAllocation](https://shopify.dev/docs/api/storefront/2023-10/objects/sellingplanallocation)

```diff
const CART_QUERY_FRAGMENT = `#graphql
  # ...other code

  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
+   sellingPlanAllocation {
+     sellingPlan {
+        name
+     }
+    }
  }
  fragment CartApiQuery on Cart {
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
    }
    # ...other code
  }
` as const;
```

[View the complete component file](server.ts) to see these updates in context.

### 3. Adjust the `/app/routes/products.$handle.tsx` route to support `sellingPLans`

### 3.1 Import the `SellingPlanSelector` component and type

```diff
+ import { SellingPlanSelector, type SellingPlanGroup } from '~/components/SellingPlanSelector';
```

### 3.2 Update the product query to fetch subscriptions data

First, add the `SELLING_PLAN_FRAGMENT` and `SELLING_PLAN_GROUP_FRAGMENT` fragments

```diff
+ const SELLING_PLAN_FRAGMENT = `#graphql
+   fragment SellingPlan on SellingPlan {
+     id
+     options {
+       name
+       value
+     }
+   }
+ ` as const;

+ const SELLING_PLAN_GROUP_FRAGMENT = `#graphql
+   ${SELLING_PLAN_FRAGMENT}
+   fragment SellingPlanGroup on SellingPlanGroup {
+     name
+     options {
+       name
+       values
+     }
+     sellingPlans(first:10) {
+       nodes {
+         ...SellingPlan
+       }
+     }
+   }
+ ` as const;
```

Next, update the `PRODUCT_FRAGMENT` to include `sellinPlanGroups` in the query

```diff
const PRODUCT_FRAGMENT = `#graphql
  ${PRODUCT_VARIANT_FRAGMENT}
+  ${SELLING_PLAN_GROUP_FRAGMENT}

  fragment Product on Product {
    # ...other code
+   sellingPlanGroups(first:10) {
+     nodes {
+       ...SellingPlanGroup
+     }
+   }
  }
` as const;
```

### 3.3 Update the `loader` logic

```ts
export async function loader({params, request, context}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  // 1. Get the selected selling plan id from the request url
  const selectedSellingPlanId =
    new URL(request.url).searchParams.get('selling_plan') ?? null;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle},
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const selectedVariant = product.variants.nodes[0];

  // 2. Pass the selectedSellingPlanId to the client
  return json({product, selectedVariant, selectedSellingPlanId});
}
```

### 3.4 Add the `<SellingPlanGroup />` component

> [!NOTE]
> Update as you see fit to match your design and requirements

```ts
//
function SellingPlanGroup({
  sellingPlanGroup,
}: {
  sellingPlanGroup: SellingPlanGroup;
}) {
  return (
    <div key={sellingPlanGroup.name}>
      <p className="mb-2">
        <strong>{sellingPlanGroup.name}:</strong>
      </p>
      {sellingPlanGroup.sellingPlans.nodes.map((sellingPlan) => {
        return (
          <Link
            key={sellingPlan.id}
            prefetch="intent"
            to={sellingPlan.url}
            className={`border inline-block p-4 mr-2 leading-none py-1 border-b-[1.5px] hover:no-underline cursor-pointer transition-all duration-200
                  ${
                    sellingPlan.isSelected
                      ? 'border-gray-500'
                      : 'border-neutral-50'
                  }`}
            preventScrollReset
            replace
          >
            <p>
              {sellingPlan.options.map(
                (option) => `${option.name} ${option.value}`,
              )}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
```

### 3.4 Update the `ProductForm` component to support subscriptions selection

```ts
function ProductForm({
  // 1. Pass in the selectedSellingPlanId from the loader
  selectedSellingPlanId,
  selectedVariant,
  sellingPlanGroups,
}: {
  selectedSellingPlanId: string | null;
  selectedVariant: ProductFragment['variants']['nodes'][0];
  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
}) {
  return (
    <div className="product-form">
      {/* 2. Add the SellingPlanSelector component inside the ProductForm */}
      <SellingPlanSelector
        sellingPlanGroups={sellingPlanGroups}
        selectedSellingPlanId={selectedSellingPlanId}
      >
        {({sellingPlanGroup}) => (
          /* 3. Render the SellingPlanGroup component inside the SellingPlanSelector */
          <SellingPlanGroup
            key={sellingPlanGroup.name}
            sellingPlanGroup={sellingPlanGroup}
          />
        )}
      </SellingPlanSelector>
      <br />

      {/* 4. Update the AddToCart button text and pass in the sellingPlanId */}
      <AddToCartButton
        disabled={
          !selectedVariant ||
          !selectedVariant.availableForSale ||
          !selectedSellingPlanId
        }
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant?.id,
                  sellingPlanId: selectedSellingPlanId,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {sellingPlanGroups.nodes
          ? selectedSellingPlanId
            ? 'Subscribe'
            : 'Select a subscription'
          : selectedVariant?.availableForSale
          ? 'Add to cart'
          : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}
```

[View the complete product file](app/routes/product.$handle.tsx) to see these updates in context.
