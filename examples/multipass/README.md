# Hydrogen example: Multipass

This folder contains an example implementation of [Multipass](https://shopify.dev/docs/api/multipass) for Hydrogen. It shows how to persist the user session from a Hydrogen storefront through to checkout.

## Requirements

- Multipass is only available on [Shopify Plus](https://www.shopify.com/plus) plans.
- A Shopify Multipass secret token. Go to [**Settings > Customer accounts**](https://www.shopify.com/admin/settings/customer_accounts) to create one.

## Key files

This folder contains the minimal set of files needed to showcase the implementation. Files that aren’t included by default with Hydrogen and that you’ll need to create are labeled with 🆕.

| File                                                                                                                    | Description                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 🆕 [`.env.example`](.env.example)                                                                                       | Example environment variable file. Copy the relevant variables to your existing `.env` file, if you have one. |
| 🆕 [`app/components/MultiPassCheckoutButton.tsx`](app/components/MultiPassCheckoutButton.tsx)                           | Checkout button component that passes the customer session to checkout.                                       |
| 🆕 [`app/lib/multipass/multipass.ts`](app/lib/multipass/multipass.ts)                                                   | Utility function that handles getting a multipass URL and token.                                              |
| 🆕 [`app/lib/multipass/multipassify.server.ts`](app/lib/multipass/multipassify.server.ts)                               | Utility that handles creating and parse multipass tokens.                                                     |
| 🆕 [`app/lib/multipass/types.ts`](app/lib/multipass/types.ts)                                                           | Types for multipass utilities.                                                                                |
| 🆕 [`app/routes/($lang).account._public.login.multipass.tsx`](<app/routes/($lang).account._public.login.multipass.tsx>) | API route that returns generated multipass tokens.                                                            |
| [`app/components/cart.tsx`](app/components/cart.tsx)                                                                    | Hydrogen cart component, which gets updated to add the `<MultiPassCheckoutButton>` component.                 |

## Instructions

### 1. Copy over the new files

- In your Hydrogen app, create the new files from the file list above, copying in the code as you go.
- If you already have a `.env` file, copy over these key-value pairs:
  - `PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET`
  - `PRIVATE_SHOPIFY_CHECKOUT_DOMAIN`

### 2. Edit the Cart component file

Import `MultiPassCheckoutButton` and update the `CartCheckoutActions()` function. Wrap the standard `<Button>` component with the `<MultiPassCheckoutButton>` component:

```tsx
// app/components/cart.tsx

import {MultiPassCheckoutButton} from '~/components';

// ...

function CartCheckoutActions({checkoutUrl}: {checkoutUrl: string}) {
  if (!checkoutUrl) return null;

  return (
    <div>
      <MultipassCheckoutButton checkoutUrl={checkoutUrl}>
        <Button>Continue to Checkout</Button>
      </MultipassCheckoutButton>
    </div>
  );
}

// ...
```

[View the complete component file](app/components/cart.tsx) to see these updates in context.
