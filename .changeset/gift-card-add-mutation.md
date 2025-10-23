---
'@shopify/hydrogen': major
---

Add `cartGiftCardCodesAdd` mutation and remove duplicate filtering from `cartGiftCardCodesUpdate`

## New Feature: cartGiftCardCodesAdd

Adds gift card codes without replacing existing ones.

**Before (2025-07):**
```typescript
const codes = ['EXISTING1', 'EXISTING2'];
await cart.updateGiftCardCodes(['EXISTING1', 'EXISTING2', 'NEW_CODE']);
```

**After (2025-10):**
```typescript
await cart.addGiftCardCodes(['NEW_CODE']);
```

## Breaking Change: cartGiftCardCodesUpdate

Removed client-side duplicate code filtering. The Storefront API handles case-insensitive normalization.

**What changed:**
- Previously: Hydrogen filtered duplicate codes before sending to API
- Now: Codes pass directly to API (thin wrapper pattern)

**Why:**
- API describes codes as "case-insensitive" in schema
- No `DUPLICATE_GIFT_CARD` error exists in API
- Consistent with all Add/Remove mutations (no filtering)
- Filtering was legacy code copied from discount codes

**Migration:**
If you rely on client-side deduplication, filter codes before calling the mutation:

```typescript
const uniqueCodes = codes.filter((value, index, array) =>
  array.indexOf(value) === index
);
await cart.updateGiftCardCodes(uniqueCodes);
```

Most users are unaffected - API handles duplicates.

## API Reference

**New method:**
- `cart.addGiftCardCodes(codes)` - Appends codes to cart
- `CartForm.ACTIONS.GiftCardCodesAdd` - Form action

**Changed method:**
- `cart.updateGiftCardCodes(codes)` - No longer filters duplicates

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
