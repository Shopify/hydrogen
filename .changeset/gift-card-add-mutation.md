---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'skeleton': patch
---

Add `cartGiftCardCodesAdd` mutation

## New Feature: cartGiftCardCodesAdd

The skeleton template has been updated to use the new `cartGiftCardCodesAdd` mutation:
- Removed `UpdateGiftCardForm` component from `CartSummary.tsx`
- Added `AddGiftCardForm` component using `CartForm.ACTIONS.GiftCardCodesAdd`

If you customized the gift card form in your project, you may want to migrate to the new `Add` action for simpler code.

## Usage

```typescript
import {CartForm} from '@shopify/hydrogen';

<CartForm action={CartForm.ACTIONS.GiftCardCodesAdd} inputs={{giftCardCodes: ['CODE1', 'CODE2']}}>
  <button>Add Gift Cards</button>
</CartForm>
```

Or with createCartHandler:

```typescript
const cart = createCartHandler({storefront, getCartId, setCartId});
await cart.addGiftCardCodes(['SUMMER2025', 'WELCOME10']);
```
