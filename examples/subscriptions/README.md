# Hydrogen example: Subscriptions / Selling Plans

This folder contains an example implementation of [subscriptions](https://shopify.dev/docs/apps/selling-strategies/subscriptions) for Hydrogen. It shows how to display selling plans on a product page.

<img width="1386" alt="Screenshot 2023-11-29 at 12 52 47 PM" src="https://github.com/Shopify/hydrogen/assets/12080141/d22ddf3e-a30c-40f7-b115-30e61cbdfa9e">

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

### 3. Adjust the `product` route to support `sellingPLans`

In `/app/routes/products.$handle.tsx`

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

## 6. (Optional) - Update Content Securirt Policy

Add `wwww.googletagmanager.com` domain to the `scriptSrc` directive

```diff
//...other code

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
- const {nonce, header, NonceProvider} = createContentSecurityPolicy();
+  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+    scriptSrc: ["'self'", 'cdn.shopify.com', 'www.googletagmanager.com'],
+ });

  //...other code

  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

```

[View the complete component file](app/entry.server.tsx) to see these updates in context.

## 7. (TypeScript only) - Add the new environment variable to the `ENV` type definition

Update the `remix.d.ts` file

```diff
// ...other code

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
+   GTM_CONTAINER_ID: `GTM-${string}`;
  }
}

// ...other code
```

[View the complete component file](remix.d.ts) to see these updates in context.
