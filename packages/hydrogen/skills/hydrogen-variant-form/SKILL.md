---
name: hydrogen-variant-form
description: >
  Behavioral guide for building product variant selection UI with
  @shopify/hydrogen. Use this skill whenever writing, modifying, or
  reviewing product option selectors, variant pickers, or add-to-cart forms.
  Framework agnostic.
---

# Product Form Primitive

The product form primitive is a client-side store that computes per-option-value existence, availability, and selection state from Shopify's encoded variant fields. Variant selection performs no network requests; it is derived from product data provided by the Storefront API, combined with live cart state for error surfacing and line-item matching. Form submission is delegated to the cart store. Framework-specific bindings (e.g. React's `useProductForm`, Vue composables) are thin wrappers over the core `createProductFormStore`.

## How the store works

The store holds a `ProductFormStoreState` and notifies subscribers on change. It is initialized with a product object and a `CartStore` instance. The product includes `encodedVariantExistence`, `encodedVariantAvailability`, product options (each with `firstSelectableVariant` per option value), a sparse variant cache (`adjacentVariants`), and a nullable `selectedOrFirstAvailableVariant`.

On initialization:
1. The store uses the encoded fields, when present, to determine which option-value combinations **exist** and which are **available** (in stock).
2. It stitches together the sparse variant cache (`adjacentVariants` + `firstSelectableVariant` per option value + `selectedOrFirstAvailableVariant`) to resolve a concrete `variant` object per option value where possible.
3. It sets the initial selection from `selectedOrFirstAvailableVariant` (server-resolved), falling back to explicitly provided `selectedOptions`, falling back to empty selection.
4. It subscribes to the `CartStore` to derive `matchedLineItem` and `errors` reactively.

On `selectOption(name, value)`:
1. The store validates that the option name and value exist on the product.
2. It validates that the combination exists when Shopify provides an encoded existence field.
3. It updates `selectedOptions` and recomputes the full options grid.
4. It returns a `VariantSelectionResult`: `resolved` (full variant matched), `unresolved` (valid, but no full variant resolved locally), or `invalid` (unknown or non-existent, with a `reason` string).

The store does **not** own URL synchronization or navigation. Add-to-cart mutation logic belongs to the cart store and is reached through `handleFormSubmit(event)`.

## State shape

```ts
interface ProductFormStoreState<TVariant> {
  options: VariantOptionState<TVariant>[];
  selectedOptions: SelectedOption[];
  selectedVariant: TVariant | null;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
}
```

`options` is the computed grid — one entry per product option, each containing its values:

- `value.name` — the option value label (e.g. "Red", "Small").
- `value.selected` — whether this value is part of the current selection.
- `value.exists` — resolved from `encodedVariantExistence` when present. `false` means no variant exists for this combination — the control should be disabled and visually de-emphasized.
- `value.available` — resolved from `encodedVariantAvailability` when present. `false` means no available variant was found for this combination.
- `value.variant` — the resolved variant object, or `null` if the combination is not in the local cache.
- `value.selectedOptions` — the full option tuple that would result from selecting this value. Used for URL construction.
- `value.handle` — the product handle for this variant. Differs from the current product's handle in combined listings.

`selectedOptions` is the current selection in product-option order (e.g. `[{name: "Size", value: "Small"}, {name: "Color", value: "Red"}]`).

`selectedVariant` is the currently resolved variant, or `null` when the selection is incomplete or the variant is not in the local cache.

`errors` surfaces cart errors relevant to this product form:
- `userErrors` — merged cart-level and line-level user errors for the matched line item.
- `warnings` — merged cart-level and line-level warnings.
- `networkErrors` — cart network errors.

`matchedLineItem` is the cart line whose `merchandise.id` matches the selected variant's ID, or `null`.

## Selection results

`selectOption` returns one of three outcomes:

- **`resolved`** — a specific variant was matched. Contains `selectedVariant` with the full variant object and `selectedOptions` with the canonical option tuple from the variant.
- **`unresolved`** — the selection is valid, but no full variant is resolved locally because the selection is incomplete or the exact variant is absent from the bounded cache. If the buyer has not selected every option yet, ask for the remaining options. If the selection is complete but missing from the local cache, fetch or otherwise resolve the exact variant before treating it as complete.
- **`invalid`** — the option name or value does not exist on the product, or the combination does not exist per the encoded existence field. State is **not** updated. Contains a `reason` string explaining why the selection was rejected.

## Register API

The `register` function binds product form identity and activation handlers. It covers three product-relevant fields. It intentionally does not emit UI props like `type`, `checked`, `disabled`, or `aria-pressed`; derive those from `options`, `selectedVariant`, and caller-owned state.

### `register("merchandiseId", opts)`

Returns `{ name: "merchandiseId", value: selectedVariantId }`. The `value` is an empty string when no variant is resolved.

### `register("quantity", opts)`

Accepts `{ value: number }` for a controlled input or `{ defaultValue: number }` for an uncontrolled input. Returns the appropriate `{ name, value }` or `{ name, defaultValue }` props, with numeric values stringified for HTML form submission.

### `register("optionValue", opts)`

Requires `{ optionName, value }`. Returns `{ name, value, onChange, onClick }` — form identity plus activation handlers. Derive caller-owned UI props from the matching option value state, such as `value.exists`, `value.available`, and `value.selected`.

## Form submission

`handleFormSubmit(event)` delegates to the underlying `CartStore`'s form submission. The store does not own submission logic — it passes the `SubmitEvent` through to the cart layer, plus selected-product event detail when a variant is resolved. Cart errors from the submission are surfaced reactively via the `errors` state.

## Hydration

When the product data changes (e.g. after a URL navigation triggers a data refetch), the store must be hydrated with the new product — not recreated. `hydrate(product, opts?)` replaces the product data, clears the decoded variant cache, and recomputes state. The new product's `selectedOrFirstAvailableVariant` takes priority; if absent, falls back to explicitly provided `opts.selectedOptions`, then to the selection that was active before hydration.

Provider bindings should hydrate automatically when the product's semantic identity changes (`product.id` + `selectedOrFirstAvailableVariant.id`). They should skip hydration on mount to avoid double-initialization, and skip hydration when the product identity is unchanged — preserving user selections through unrelated re-renders. Standalone `useProductForm(store)` users manage hydration themselves.

## Reset

`reset()` restores the store to its initial state — the product and selected options it was created with. It clears the decoded variant cache and recomputes all derived state. Useful for "reset form" interactions.

## Extracting selected options from the URL

`getSelectedProductOptions(input, opts?)` extracts selected options from a `Request`, `URL`, `URLSearchParams`, or URL string. Each query parameter is treated as an option name/value pair (e.g. `?Color=Red&Size=M` produces `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`).

Pass `{ optionNames: [...] }` to filter to only known option names, avoiding unrelated query parameters.

---

## Rules

### Existence and availability

- **ALWAYS disable and visually de-emphasize option values where `exists` is `false`.** These represent combinations that do not exist in the product's variant matrix. A non-existent combination cannot be selected — showing it as interactive is misleading.
- **NEVER disable option values where `exists` is `true` but `available` is `false`.** These are sold-out variants. The control must remain interactive so the buyer can see what the variant would be. Show a "Sold out" indicator instead.
- **NEVER hide option values based on the current selection.** All values for an option must always be visible. Hiding values based on what's currently selected creates a confusing, collapsing UI that prevents buyers from exploring the full product matrix.

### Selection and navigation

- **With provider bindings, put URL navigation in the provider `onSelect` callback.** Do not navigate inside each same-product option button. Let `register("optionValue", ...)` call `selectOption`; the provider receives the valid selection result and owns URL sync from there.
- **ALWAYS use URL-based variant selection in URL-routing apps.** When the buyer selects an option, navigate to the URL representing that selection — replacing the history entry and without resetting scroll position. The URL is the durable source of truth — the data loader reads the selection from the URL, queries the Storefront API, and the response hydrates the store when a reload or revalidation happens.
- **ALWAYS use the `selectOption` return value for navigation, not a reactive effect on state.** `selectOption` returns the result synchronously. Use the returned `selectedOptions` to construct the next URL immediately. Reacting to derived state (e.g. `selectedOptions` from the store) instead introduces an unnecessary update cycle and risks stale values. Framework bindings may wrap this as an `onSelect` callback — the principle is the same.
- **Skip data refetch only when the resolved local state is sufficient.** When `selectOption` returns `resolved`, the selected variant is already in the local cache. It is safe to skip revalidation only if the route does not need fresh loader data for other UI. When a complete selection returns `unresolved`, fetch or otherwise resolve the exact variant before treating the selection as complete.
- **NEVER call `selectOption` for combined-listing cross-product values.** When `value.handle !== product.handle`, the value belongs to a different product. Render it as a navigation element (anchor or link component) that navigates to the other product's URL — not a button that calls `selectOption`. The store only knows about the current product's variant matrix.

### Combined listings

- **ALWAYS check `value.handle` against the current `product.handle`.** If they differ, the option value points to a different product in a combined listing. The UI must navigate to that product (full page navigation or a link component), not call `selectOption`.
- **Use the framework's client-side link component for cross-product values when one exists.** React Router should use `<Link>`, Nuxt should use `<NuxtLink>`, and similar frameworks should use their idiomatic navigation primitive. Use a raw `<a>` only when that is the app's established routing convention.
- **Preserve non-option query params on combined-listing links.** When constructing the URL for a combined-listing link, carry forward existing search params (e.g. `?ref=campaign`) and replace only the option params. Two-pass URL construction: delete all option params first, then set the new ones — this prevents stale params when combined-listing products have different option names.

### React Router provider pattern

Use the provider's `onSelect` callback for same-product URL sync:

```tsx
<ProductProvider
  product={product}
  onSelect={(result) => {
    void navigate(
      toRouterLocation(
        variantUrl(product, result.selectedOptions, result.selectedVariant?.product?.handle),
      ),
      {
        replace: true,
        preventScrollReset: true,
      },
    );
  }}
>
  <ProductPurchasePanel product={product} />
</ProductProvider>
```

If a route should skip loader revalidation for locally resolved selections, use the framework's supported route-level revalidation API. Do not pass unsupported revalidation flags to `navigate()`.

Same-product option values are buttons that spread the registered handlers directly:

```tsx
<button
  type="button"
  aria-pressed={value.selected}
  disabled={!value.exists}
  {...register("optionValue", { optionName: option.name, value: value.name })}
>
  {value.name}
</button>
```

Cross-product option values are framework links that reuse the same URL helper:

```tsx
<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle))}
  preventScrollReset
>
  {value.name}
</Link>
```

### Price display

- **ALWAYS display server-provided prices.** Use `selectedVariant.price` when a variant is resolved. Fall back to `product.priceRange.minVariantPrice` when no variant is selected. Never compute prices client-side.
- **Format with `Intl.NumberFormat`**, not string concatenation. The variant provides `amount` (string) and `currencyCode` (string).

### Add-to-cart

- **ALWAYS use `canAddToCart(product, options)` to determine if the add-to-cart button should be enabled.** This checks three conditions: a variant is selected, it is available for sale, and the product does not require a selling plan. Checking only `selectedVariant !== null` misses the selling-plan and availability constraints.
- **The add-to-cart form is separate from the variant selector.** Variant selection uses buttons and links — not form submissions. The add-to-cart form contains `merchandiseId` (the selected variant ID) and `quantity`. Do not put variant selection controls inside the cart form.
- **Use `register` to bind form fields.** `register("merchandiseId", {})` returns the hidden input props with the current variant ID. `register("quantity", { value: 1 })` returns the quantity input props. These stay synchronized with store state automatically.
- **Show contextual CTA text.** When `canAddToCart` is `true`: "Add to cart". When no variant is selected (`selectedVariant === null`): "Select options" unless a navigation or submission is actually pending. When a variant is selected but unavailable: "Unavailable" or "Sold out".
- **Surface cart errors from `errors` state.** After form submission, user errors, warnings, and network errors relevant to the current product form are available on `state.errors`. Display these to the buyer.

### Store lifecycle

- **Create the store once per component mount.** Do not recreate the store when the product prop changes — use `hydrate()` instead. Recreating the store discards the decoded variant cache and any user interaction state.
- **Always call `destroy()` on unmount.** This unsubscribes from the `CartStore` and releases internal caches (the decoded variant field cache). Provider bindings handle this automatically; standalone store users must do it themselves.
- **Do not read stale state after hydration.** Hydration triggers a synchronous state update. Any code that caches the previous state reference before hydration holds a stale reference.

### Accessibility

- **Use `aria-pressed` on option value buttons** to communicate the selected state to assistive technology. Derive it from the matching option value's `selected` state, for example `aria-pressed={value.selected}`.
- **Use `aria-label` on visual-only controls** (e.g. color swatches without visible text).
- **Disabled controls (`exists: false`) must use the native `disabled` attribute** — not `aria-disabled` with prevented clicks. Non-existent combinations are truly non-interactive.

---

## User Acceptance Tests

### Initial state

1. **Pre-selected variant** — When the product has a `selectedOrFirstAvailableVariant`, the corresponding option values are marked as selected on first render. The variant's price and details are displayed. `selectedVariant` on the state is non-null.
2. **No pre-selected variant** — When `selectedOrFirstAvailableVariant` is `null`, no option values are selected. `selectedVariant` is `null`. The add-to-cart button shows "Select options" (or equivalent) and is disabled.
3. **URL-driven selection** — When the URL encodes a variant selection (e.g. via option params like `?Color=Blue&Size=Small`), the data loader resolves the selection and passes it to the Storefront API query. The returned `selectedOrFirstAvailableVariant` reflects the URL selection, and the store initializes with those options selected.

### Option selection

4. **Select a value** — Click an option value button. The value becomes selected (visually indicated). If the selection resolves to a variant, the price and variant details update immediately. `selectedVariant` updates on the state. In URL-routing apps, the URL updates to reflect the new selection without a scroll reset.
5. **Multi-option selection** — On a product with Size and Color options, select Size=Large then Color=Blue. Both selections are reflected in the state. The resolved variant matches Large/Blue.
6. **Switch within an option** — With Color=Red selected, click Color=Blue. The selection switches; Red is deselected, Blue is selected. Only one value per option is selected at a time.
7. **Invalid selection ignored** — Calling `selectOption` with an unknown option name or value returns `invalid` with a `reason` string and does not change state. No navigation occurs.
8. **Non-existent combination** — An option value where `exists: false` is disabled. Clicking it does nothing.
9. **Sold-out variant** — An option value where `exists: true` and `available: false` is interactive but shows a "Sold out" indicator. Selecting it updates the state and shows the variant as unavailable.

### Combined listings

10. **Cross-product value** — An option value where `value.handle !== product.handle` renders as a navigation element (anchor or link component), not a button. Clicking it navigates to the other product's page with the appropriate option params.
11. **Same-product value** — An option value where `value.handle === product.handle` renders as a button that calls `selectOption`.
12. **Preserved params** — When navigating via a combined-listing link, non-option query params from the current URL are preserved in the destination URL.

### Hydration

13. **Product navigation** — Navigating from Product A to Product B (different `product.id`) hydrates the store with Product B's data. The selection reflects Product B's `selectedOrFirstAvailableVariant`.
14. **Same product, different variant** — Navigating to the same product with a different URL-encoded selection (e.g. `?Color=Blue` instead of `?Color=Red`) hydrates with the new pre-selected variant without recreating the store.
15. **Unrelated re-render** — A re-render that passes the same product identity does not hydrate. User selections made since the last hydration are preserved.
16. **No double-init on mount** — On initial mount, the store initializes from the constructor — hydration does not fire. A user selection made immediately after mount survives a subsequent re-render with the same product.

### Cart integration

17. **Matched line item** — When the selected variant's ID matches a cart line's `merchandise.id`, `matchedLineItem` is non-null and contains the cart line data.
18. **Cart error surfacing** — After a failed add-to-cart submission, `errors.userErrors` contains the relevant user errors, `errors.warnings` contains warnings, and `errors.networkErrors` contains any network failures.
19. **Reactive cart sync** — When the cart updates externally (e.g. quantity change from a cart drawer), the `matchedLineItem` and `errors` update without any manual intervention.

### Add-to-cart

20. **Enabled state** — When `canAddToCart` returns `true` (variant selected, available, no selling plan required), the add-to-cart button is enabled and shows "Add to cart".
21. **Disabled — no variant** — When no variant is selected, the button is disabled with "Select options" text unless navigation or submission is actually pending.
22. **Disabled — sold out** — When the selected variant is not available for sale, the button is disabled with "Unavailable" or "Sold out" text.
23. **Disabled — selling plan required** — When `product.requiresSellingPlan` is `true`, the button is disabled regardless of variant selection.
24. **Variant ID in form** — `register("merchandiseId", {})` returns `{ name: "merchandiseId", value: selectedVariantId }`. When no variant is selected, `value` is an empty string.
25. **Form submission** — `handleFormSubmit(event)` delegates to the cart store with the submit event and selected-product detail when a variant is resolved. Cart errors surface reactively via the `errors` state.

### Register API

26. **Option value registration** — `register("optionValue", { optionName: "Color", value: "Red" })` returns `{ name, value, onChange, onClick }`. Calling `onChange` or `onClick` triggers `selectOption`.
27. **Caller-owned option attributes** — `register("optionValue", { optionName: "Color", value: "Red" })` returns only `{ name, value, onChange, onClick }`. Derive `disabled`, `aria-pressed`, and visual state from the matching `options` value.
28. **Quantity registration** — `register("quantity", { value: 1 })` returns `{ name: "quantity", value: "1" }`. `register("quantity", { defaultValue: 1 })` returns `{ name: "quantity", defaultValue: "1" }`.

### Unresolved selection

29. **Transient unresolved** — In URL-routing apps, when a complete selection returns `unresolved` because the exact variant is absent from the local cache, the app navigates to the new URL and re-fetches product data. The subsequent hydration resolves the variant. Incomplete selections should remain in selection UI until the buyer chooses the remaining options.

### Reset

30. **Reset to initial state** — Calling `reset()` restores the store to the product and selected options it was created with. All user selections are discarded.

---

## Anti-patterns

- **Hiding option values based on selection.** Showing only "compatible" values for the current selection collapses the option matrix and prevents exploration. Always show all values; use `exists` and `available` for visual treatment.
- **Disabling sold-out variants.** Sold-out variants (`available: false`) should be selectable so buyers can see what they would get. Only non-existent combinations (`exists: false`) are truly disabled.
- **Client-computed prices.** Never compute prices from variant data or option combinations. Always use server-provided `price` / `compareAtPrice` / `priceRange` amounts.
- **Recreating the store on product prop changes.** Use `hydrate()` instead. Recreating discards the decoded variant cache, the cart subscription, and any user interaction state.
- **Using reactive effects on state to sync selection to URL.** The `selectOption` return value provides the selection result synchronously. Reacting to `state.selectedOptions` instead introduces an extra update cycle and can fire with stale values.
- **Navigating inside same-product option buttons.** Do not destructure `onClick` / `onChange` from `register("optionValue", ...)`, call `navigate()`, and then call the registered handler manually. This bypasses the provider `onSelect` contract and can navigate from stale or invalid data.
- **Calling `selectOption` for combined-listing values.** When `value.handle` differs from the current product's handle, the value belongs to a different product. Use a navigation element (anchor or link component) for full navigation — `selectOption` only understands the current product's matrix.
- **Using raw anchors when the framework has a client-side link component.** Raw `<a>` tags lose client-router behavior such as scroll preservation, pending navigation state, prefetching, and route transitions. Use the app's established link component unless raw anchors are the framework convention.
- **Checking only `selectedVariant !== null` for add-to-cart.** This misses two constraints: the variant must be `availableForSale`, and `product.requiresSellingPlan` must not be `true`. Use `canAddToCart()`.
- **Putting variant selection inside the add-to-cart form.** Variant selection is button/link interactions that update store state. The add-to-cart form submits `merchandiseId` and `quantity` to the cart. Mixing them creates ambiguous form semantics and breaks progressive enhancement.
- **Ignoring `errors` state after form submission.** Cart user errors, warnings, and network errors are surfaced reactively on the store state. Failing to display these leaves the buyer with no feedback when something goes wrong.
- **Manually computing `selectedVariant` from `options`.** Use `state.selectedVariant` directly — it is derived and kept in sync automatically. The older pattern of `options[0].values.find(v => v.selected)?.variant` is unnecessary.
