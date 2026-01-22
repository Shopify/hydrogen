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

Removed client-side duplicate code filtering. The Storefront API handles duplicates gracefully.

**What changed:**
- Previously: Hydrogen filtered duplicate codes before sending to API
- Now: Codes pass directly to API (thin wrapper pattern)

**Why:**
- API is idempotent for duplicate codes (verified via E2E testing)
- Consistent with all Add/Remove mutations (no filtering)
- Filtering was legacy code copied from discount codes

## Verified API Behavior (E2E tested 2026-01-21)

| Scenario | Behavior |
|----------|----------|
| Valid gift card code | Applied successfully |
| UPPERCASE code | Works (API is case-insensitive) |
| Duplicate code in same call | Idempotent - applied once, no error |
| Re-applying already applied code | Idempotent - no error, no duplicate |
| Multiple different codes | All applied successfully |
| Invalid code | Silently rejected (no error surfaced) |
| Code with whitespace | Rejected (API does not trim whitespace) |
| Empty input | Graceful no-op |

**Key finding:** The API handles duplicate gift card codes gracefully - submitting an already-applied code results in silent success (idempotent behavior), not an error. No `DUPLICATE_GIFT_CARD` error code exists.

## Migration

**Most users are unaffected.** The API handles duplicates gracefully.

If you rely on client-side deduplication for other reasons (e.g., avoiding unnecessary API calls), filter codes before calling:

```typescript
const uniqueCodes = [...new Set(codes)];
await cart.updateGiftCardCodes(uniqueCodes);
```

**Note on whitespace:** The API does NOT trim whitespace from codes. Ensure codes are trimmed before submission if accepting user input.

## API Reference

**New method:**
- `cart.addGiftCardCodes(codes)` - Appends codes to cart
- `CartForm.ACTIONS.GiftCardCodesAdd` - Form action

**Changed method:**
- `cart.updateGiftCardCodes(codes)` - No longer filters duplicates

## Skeleton Template Changes

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
