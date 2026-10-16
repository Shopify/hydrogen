# ADR 0003: Product signifiers

- Status: Accepted for phase 1 (#1285, 2026-10-15)
- Issue: [#1285](https://github.com/Shopify/developer-tools-team/issues/1285)
- Scope: product option values and product quantity only
- Related: [ADR 0001](0001-standard-signifiers.md), [scope decision](https://github.com/Shopify/developer-tools-team/issues/1285#issuecomment-6206407787)

## Context

Variant tests found controls by accessible name, ARIA state, and URL shape. These properties remain useful assertions, but they do not identify a product option without assumptions about labels and markup.

Phase 1 adds product, cart-line, and collection signifiers. This record covers only product controls. It does not add standard events, event waits, or page readiness. Existing internal events stay in place.

## Decisions

- Add `product-option-value` with exactly `{ optionName: string; optionValue: string; selected: boolean }`.
- Add `product-quantity` with empty state `{}` on the editable quantity input. The native input value remains the quantity source.
- Do not add `product-form`.
- `register('optionValue', { optionName, value })` adds option signifiers to buttons or inputs. Never spread registration props onto links. Both quantity overloads add the quantity signifier. The caller still owns native and ARIA state.
- Add `getProductOptionValueAttributes(optionName, value)` for all option links, including hydrated same-product and combined-listing links. It accepts `Pick<VariantOptionValueState, 'name' | 'selected'>` and returns only signifier attributes. It adds no URL, handler, type, disabled state, or ARIA state. Keep guarded selection handlers on same-product links.
- Keep `createProductFormRegister(selectedVariant, selectOption)` valid. Its optional third argument is `selectedOptions = selectedVariant?.selectedOptions ?? []`. React and Vue pass the current store selection so unresolved selections stay marked. Core callers must pass this argument for unresolved selections and recreate the register function after state changes. Duplicate option keys use the last value, as the product store does.
- Keep all attributes in production. Use the existing schema, serializer, selector, and missing/ambiguous error rules. No new provider, controller, or dependency is needed.

### Picker support

The portable contract supports per-value links, buttons, radios, and checkboxes. Links keep their URLs and `aria-current`, buttons keep `aria-pressed`, and inputs keep native checked state. Native links remain the no-JavaScript path. Clipped, focusable controls can use keyboard activation; the runner does not force clicks. Controls hidden with `display: none` are not buyer-activatable controls.

A native select picker is not supported in this phase. A signifier on an `option` does not provide a portable per-value activation target. No existing small mechanism supports it without a new picker contract. Do not put this signifier on a `select` and treat it as supported. A later change must define and test that contract explicitly.

### Test boundary

Discovery includes variant IDs, availability, and selected options. Variant tests find controls by option signifiers, retain URL/query-sentinel/reload/native-state checks, and check that `product-add-to-cart.variantId` agrees with the discovered selection. The no-JavaScript test stays active, with the existing explicit Next.js opt-out unchanged.

The variant sample is bounded to 20 variants per product, not the full catalog. Product option metadata, not the sampled variant values, establishes whether an omitted option is a singleton. Editable options still need selected controls. A rendered selection must match exactly one sampled variant; an absent or ambiguous match fails instead of guessing the variant ID.

The product-page test edits quantity to `2` and checks the native value. That check alone is not evidence that a quantity of two reaches a settled cart line. The cart journey supplies that evidence: it fills `product-quantity` with `2` (with the same idempotent fill/value retry), uses the UI add-to-cart control, waits for the existing cart totals/status settlement, and asserts that the matching rendered `cart-line` has quantity `2`, `pending: false`, and a native quantity input value of `2`. It does not inject cart state or replace settlement with an event or network wait.

## Consequences

- Variant control discovery does not depend on copy or accessible names.
- Semantic, URL, and native-state checks remain independent evidence.
- Select pickers remain an explicit boundary, not a claimed pass.
