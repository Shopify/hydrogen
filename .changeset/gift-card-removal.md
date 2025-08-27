---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Add support for removing individual gift cards from cart

The `cartGiftCardCodesUpdate` mutation requires all gift card codes to be provided, but the API only returns the last 4 digits for security. This made it impossible to remove specific gift cards when multiple were applied.

This fix introduces the missing `cartGiftCardCodesRemove` mutation to remove gift cards by their IDs.

**What changed:**

**In `@shopify/hydrogen`:**

- Added `cartGiftCardCodesRemoveDefault` mutation handler
- Added `removeGiftCardCodes` method to `HydrogenCart`
- Added `GiftCardCodesRemove` action to `CartForm.ACTIONS`
- Updated default cart fragment to include `appliedGiftCards` with `id` field

**In the skeleton template:**

- Added `id` field to `appliedGiftCards` fragment
- Updated `CartSummary` to show individual remove buttons per gift card
- Added handler for `GiftCardCodesRemove` action in cart route
- Maintained client-side tracking for additive gift card updates

**Usage example:**

```tsx
// In your cart component
function RemoveGiftCardButton({giftCardId}: {giftCardId: string}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId], // Pass the gift card ID
      }}
    >
      <button type="submit">Remove</button>
    </CartForm>
  );
}
```

**Cart handler usage:**

```ts
// The cart handler now includes removeGiftCardCodes method
const cart = createCartHandler({...});

// Remove specific gift cards by their IDs
const result = await cart.removeGiftCardCodes(['giftCardId1', 'giftCardId2']);
```
