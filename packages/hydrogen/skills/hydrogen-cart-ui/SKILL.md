---
name: hydrogen-cart-ui
description: >
  Behavioral guide for building cart UI with @shopify/hydrogen. Use this
  skill whenever writing, modifying, or reviewing cart components. Framework agnostic.
---

# Cart Primitive

The cart primitive is a client-side store that syncs with Shopify via Standard Actions events. It provides optimistic updates, scoped error handling, and a form-based mutation API. The store is framework-neutral; framework-specific bindings are thin wrappers over the core store.

## Framework Bindings

Before building UI, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework binding first; the reference owns provider setup, state selectors, and form helpers for that runtime.

If there is no matching reference, there may be no packaged `@shopify/hydrogen/<framework>` export. Use the framework-neutral `createCartStore` and `createCartFormRegister` from `@shopify/hydrogen` directly, subscribe to store changes with the framework's reactivity primitive, and apply every rule in this skill yourself. Packaged bindings are thin wrappers over these same core APIs — match their behavior, do not invent a new contract.

In island-based frameworks, use the binding for the island's UI framework when a matching reference exists; otherwise use the core store directly.

## Route Placement

When creating a full cart page, use the app's existing route convention when present; otherwise create `/cart`. This page is separate from Hydrogen's `/api/cart` server handler, which is registered with `createCartServerHandlers()` through `handleShopifyRoutes`.

## How the store works

The store holds a `CartState` and notifies subscribers on change. Mutations flow through Shopify Standard Actions — the store listens for `shopify:cart:lines-update`, `shopify:cart:discount-update`, and `shopify:cart:note-update` DOM events. Each event carries a `promise` that resolves with the server response.

On mutation:
1. The store applies an **optimistic update** — the UI-visible state changes immediately.
2. The affected entity is added to `pending` — a set of in-flight line IDs, discount codes, or a note boolean.
3. When the promise resolves, the store **reconciles** optimistic state with server truth and clears the pending entry.
4. On failure, the store **rolls back** to a captured baseline and clears the pending entry.

The store manages one abort controller per line ID, one per discount batch, and one for the note. A new mutation for the same entity aborts the in-flight one — this is what makes rapid clicks safe without disabling controls.

## Stable selectors

Store selectors should select primitives or stable references from the store. Do not allocate arrays, objects, maps, sets, or derived view models inside a selector unless the framework binding also accepts an equality function.

Bad:

```ts
const selectMessages = (state) => [
  ...state.errors.network.map((error) => error.message),
  ...state.errors.cart.userErrors.map((error) => error.message),
];
```

That selector returns a new array whenever the store notifies subscribers, so bindings that rely on referential equality cannot skip unchanged output. Select stable slices first, then derive:

```ts
const selectErrors = (state) => state.errors;
const messages = deriveFromErrors(errors, () => {
  return [
    ...errors.network.map((error) => error.message),
    ...errors.cart.userErrors.map((error) => error.message),
  ];
});
```

## Pending state

`state.pending` tracks what is currently in-flight:

- `pending.lines` — `Set<string>` of line IDs with mutations in flight.
- `pending.discountCodes` — `Set<string>` of discount codes being applied or removed.
- `pending.note` — `boolean` indicating whether a note save is in flight.

Any value whose entity is in a pending set is **optimistic and unconfirmed**. The UI must treat it differently from confirmed values.

## Error state

`state.errors` is scoped to the entity that caused the error:

- `errors.lines` — `Map<string, CartErrorGroup>` keyed by line ID.
- `errors.discountCodes` — `Map<string, CartErrorGroup>` keyed by discount code string.
- `errors.note` — `CartErrorGroup` for note-related errors.
- `errors.cart` — `CartErrorGroup` for cart-level errors not attributable to a specific entity.
- `errors.network` — `CartNetworkEntry[]` for transport failures (timeouts, HTTP errors).
- `errors.lastUpdatedAt` — timestamp of the most recent error update across any scope. Per-scope timestamps also exist (`linesUpdatedAt`, `discountCodesUpdatedAt`, etc.).

Each `CartErrorGroup` contains `{ userErrors: CartUserError[], warnings: CartWarning[] }`.

---

## Rules

### Money

- **NEVER calculate currency amounts on the client.** Display server-provided amounts (`line.cost.totalAmount`, `state.data.cost.subtotalAmount`, etc.) directly. Client-side arithmetic drifts from the truth when discounts, taxes, duties, or rounding apply. If a value is stale because a mutation is in-flight, show it with pending UI — not a client-computed estimate.
- **Format with Hydrogen money helpers**, not string concatenation. Use the local `hydrogen-money` skill for an app wrapper around `formatMoney()`. The store provides `amount` (string) and `currencyCode` (string).

### Optimistic interactions

- **NEVER disable interactive controls during pending state.** Increase, decrease, remove, apply, and remove-discount controls must always be interactive. The store's abort-controller pattern makes concurrent mutations safe — a new click supersedes the in-flight request.
- **NEVER show a spinner or skeleton where a stale value would do.** The user already sees a quantity and a price. Replacing confirmed-looking content with a loading state is a regression. Show the previous value with a visual indicator that it's unconfirmed.
- **ALWAYS visually indicate unconfirmed data.** Any value whose entity is in a `pending` set must look visually distinct from confirmed values. Reduced opacity is the reference pattern — the stale text acts as a spatial placeholder (like a skeleton), not as readable content. Rules of contrast can be disregarded because the pending value is a signal, not content the user needs to read.
- **NEVER block navigation during pending.** Cart mutations are fire-and-forget from the user's perspective. No confirmation dialogs on route change.

### Errors

- **ALWAYS display errors closest to the element they describe.** A line item error appears next to that line item. A discount code error appears next to that discount code. Errors should not only live in a distant banner.
- **Use a banner only for errors that have no inline home.** This includes: network errors, cart-level errors, and orphaned line errors.
- **Orphaned line errors** — when `errors.lines` contains entries for line IDs not present in `state.data.lines.nodes`, those errors have no inline target. Surface them in the banner. This happens when a line was removed but the server returned errors referencing its ID.
- **Inline errors must be accessible** — use `role="alert"` and link them to the nearest interactive element via `aria-describedby`. Mark the associated input as `aria-invalid="true"`.
- **Use `errors.lastUpdatedAt` for dismissal.** Track a local `dismissedAt` timestamp. If `lastUpdatedAt <= dismissedAt`, the banner is hidden. If a new error arrives with a newer timestamp, the banner reappears.

### Note editing

- **Maintain a local draft** for the note, synced from the store. When the server responds with an updated note, only overwrite the local draft if `pending.note` is `false`. This prevents the server response from clobbering the user's in-progress typing.
- **Allow users to click the save button even when the draft matches the stored note** (nothing to save), but prevent any action. This enables progressive enhancement and prevents frustration.
- **Show a pending indicator** while the note mutation is pending.

### Form structure

- **Each line item is its own form.** This gives each line its own identity input and its own submit buttons. A single form containing multiple lines creates ambiguity about which line an action targets.
- **Each line item form must preserve the progressive-enhancement shape.** The rendered structure will vary by framework and design system, but every line item quantity form needs the same Hydrogen contract: `register("set")`, `register("lineId", { value: line.id })`, and a real editable quantity input using `register("quantity", { value: line.quantity, interactive: true })`. Increase, decrease, and remove buttons are additional submit controls, not replacements for the set intent or the quantity input.
- **Each discount "remove" button is its own form** — separate from the "apply" form. The apply form needs input validation (empty/duplicate prevention); each remove form is a single action.

### Loading

- **While `loading` is `true`**, show skeleton placeholders — not empty state. The cart hasn't been fetched yet.
- **When `loading` is `false` and `lines` is empty**, show empty state ("Your cart is empty" or equivalent).
- **If `initialData` is provided** when creating the store, `loading` starts as `false` and the initial fetch is skipped. This eliminates the skeleton state entirely — the cart renders with server data on first paint.

---

## User Acceptance Tests

### Line items

1. **Increase quantity** — Click the increase control. The displayed quantity increments immediately. The quantity and totals appear in their pending visual state until the server confirms.
2. **Decrease quantity** — Click the decrease control. Same optimistic behavior. At quantity 1, decreasing removes the line.
3. **Remove line** — Activate the remove control. The line disappears immediately. Totals update optimistically.
4. **Rapid clicks** — Click increase five times quickly. Each click increments the displayed quantity by one. The store aborts intermediate requests. The final server-confirmed state matches the quantity the user sees.
5. **Failure rollback** — If the server rejects a line update, the quantity reverts to the last confirmed value. An error message appears inline next to the affected line item.
6. **Line-scoped error** — When the server returns a `userError` scoped to a specific line, the message appears adjacent to that line (not only in a banner). The relevant input is marked `aria-invalid`.
7. **Progressive quantity set** — The line item form contains a hidden `set` submit control, hidden/read-only `lineId`, and an editable quantity input. Pressing Enter in the quantity input submits a set-quantity action.
8. **No-JS line update** — If JavaScript fails or hydration has not run, the line item form can still submit an explicit quantity value to the cart action endpoint.

### Discount codes

9. **Apply discount** — Enter a code and submit. The code appears in the list immediately in its pending visual state. When the server confirms, the pending indicator clears and the "applied" / "not applicable" status updates.
10. **Duplicate prevention** — Submitting a code that is already present does nothing.
11. **Empty input prevention** — Submitting with a blank input does nothing.
12. **Remove discount** — Activate the remove control next to a code. The code disappears optimistically.
13. **Discount-scoped error** — If the server returns an error for a specific code, the message appears next to that code in the list.

### Order note

14. **Save note** — Edit the text and submit. A pending indicator appears while the mutation is in-flight.
15. **No-op save** — When the draft matches the stored note, clicking on save does nothing (but can still be clicked).
16. **Server sync without clobber** — After save completes, the local draft updates to match the server response — but only when `pending.note` is `false`, preserving any typing the user did in the meantime.

### Error banner

17. **Network error** — When a mutation fails due to a transport error, a banner appears with the error message and a dismiss control.
18. **Cart-level error** — Errors not attributable to a line, code, or note appear in the banner.
19. **Orphaned line error** — If a line no longer exists in `state.data.lines.nodes` but `errors.lines` has an entry for its ID, that error appears in the banner.
20. **Dismiss and re-trigger** — Dismissing the banner hides it. A subsequent error (with a newer `lastUpdatedAt`) re-shows it.

### Totals

21. **Pending totals** — While any line or discount mutation is in-flight, subtotal and total appear in their pending visual state. The amounts shown are the last server-confirmed values — never client-computed.
22. **Settled totals** — When all pending sets are empty, totals display normally with the latest server values.

### Loading

23. **Initial load** — Before the cart is fetched, show skeleton placeholders.
24. **Empty cart** — After fetch completes with zero lines, show empty state.

---

## Anti-patterns

- **Client-computed totals.** Multiplying quantity by unit price drifts from the true total when discounts, taxes, or rounding apply. Always use server-provided amounts.
- **Hand-rolled framework cart state.** If the skill has a matching framework reference, use its provider/hooks/helpers. Otherwise, use the core store directly instead of duplicating cart data in component state or custom reducers.
- **Disabling controls during pending.** The store's abort-controller pattern makes rapid interactions safe. Disabling controls makes the cart feel sluggish and punishes fast users.
- **One form for all lines.** Each line needs its own identity — its own form. A shared form creates ambiguous intent when multiple submit buttons exist.
- **Quantity as text only.** Rendering quantity as a `<span>` with only plus/minus buttons breaks the set-quantity path and the no-JS fallback. Use a real input wired with `register("quantity", { value, interactive: true })`.
- **Plus/minus-only line forms.** Increase/decrease/remove buttons do not replace `register("set")` and the interactive quantity input. Omitting them breaks the form invariant even if hydrated clicks appear to work.
- **Drawer-specific line form drift.** The cart drawer may have a different layout from the `/cart` page, but its line item forms must keep the same Hydrogen form contract. Prefer sharing line item form components between the page and drawer.
- **Banner-only errors.** A line-level error displayed far from the line it refers to is effectively invisible. Show inline first; promote to the banner only when there's no inline target.
- **Confirmed-looking pending values.** Showing full-opacity values for in-flight data misleads the user into thinking the data is settled. Always visually distinguish unconfirmed state.
- **Disabling note save.** The save control is never disabled — it remains interactive even when there's nothing to save (draft matches store) or while a save is in-flight. When there's nothing to save, clicking does nothing. During flight, show a pending indicator.
- **Blocking navigation during pending.** Cart mutations resolve in the background. Confirmation dialogs on route change frustrate users.
