---
name: hydrogen-cart-ui
description: >
  Behavioral guide for building cart UI with @shopify/hydrogen: line items,
  quantity and remove controls, optimistic updates, discount, note, and cart
  attribute inputs, and the full-page /cart fallback. Use when writing,
  modifying, or reviewing cart line-item UI, quantity/remove controls, or cart
  mutation forms. Framework agnostic.
---

# Cart Primitive

The cart primitive is a client-side store that syncs with Shopify via Standard Actions events. It provides optimistic updates, scoped error handling, and a form-based mutation API. The store is framework-neutral; framework-specific bindings are thin wrappers over the core store.

## Framework Bindings

Before building UI, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework binding first; the reference owns provider setup, state selectors, and form helpers for that runtime.

If there is no matching reference, there may be no packaged `@shopify/hydrogen/<framework>` export. Use the framework-neutral `createCartStore` and `createCartFormRegister` from `@shopify/hydrogen` directly, subscribe to store changes with the framework's reactivity primitive, and apply every rule in this skill yourself. Packaged bindings are thin wrappers over these same core APIs — match their behavior, do not invent a new contract.

In island-based frameworks, use the binding for the island's UI framework when a matching reference exists; otherwise use the core store directly.

## Route Placement

When creating a full cart page, use the app's existing route convention when present; otherwise create `/cart`. This page is separate from Hydrogen's `/api/cart` server handler, which is registered with `createCartServerHandlers()` through `handleShopifyRoutes`.

**The `/cart` page must render from the server data path.** It is the fallback route for the cart drawer (reachable as a real `/cart` link in the footer), so its line items and totals must not depend only on an ad hoc client store read. Seed `CartProvider` with `initialData` from the server data path (React Router loader, Next.js server layout/page). When the framework can preserve streamed promises, pass the unresolved cart promise as `initialData` instead of awaiting it; the Next.js reference is the best current non-blocking pattern. If strict no-JS HTML must include the real cart today, pass the resolved handler envelope instead. A `/cart` page whose only data source is a client `useCart` read renders "Your cart is empty" without JS even when the shopper has items. See the framework reference for the exact wiring.

**The native no-JS add-to-cart POST must set the cart cookie server-side.** With scripting off, the add-to-cart `<form method="post">` submits natively and the cart server handler must respond with the cart cookie so the next `/cart` request server-renders the seeded cart — not only service the hydrated `fetch`. See the `hydrogen-request-handlers` skill for the endpoint contract.

## How the store works

The store holds a `CartState` and notifies subscribers when it changes. `state.readyPromise` is present while an applicable full-cart load is pending and resolves after the resulting state is published. Mutations flow through Shopify Standard Actions — the store listens for `shopify:cart:lines-update`, `shopify:cart:discount-update`, `shopify:cart:note-update`, and `shopify:cart:attributes-update` DOM events. Each event carries a `promise` that resolves with the server response.

On mutation:

1. The store applies an **optimistic projection** over its settled state, so the UI-visible state changes immediately.
2. The affected entity is added to `pending` — a set of in-flight line IDs or discount codes, or a note/attributes boolean.
3. When the promise resolves, the store folds that transaction into settled state and reapplies remaining projections. Overlapping mutations discard ambiguous response snapshots, then coalesce one authoritative cart refresh after the burst settles.
4. On failure, the store removes only the failed projection, preserves unrelated work, and clears the matching pending entry.

When overlapping mutations make response snapshots ambiguous, the store sets `state.revalidating` to `true`. It starts one authoritative refresh after those mutations settle and clears the flag when the refresh completes or fails. Until then, server-derived values such as costs remain at their last trustworthy value. A refresh failure preserves the locally reconciled cart and appears in `errors.network`.

The store supersedes keyed mutations for the same line, discount batch, note, or complete attribute list. Relative additions remain independent so every submitted quantity reaches the server; their projections are reconciled together without disabling controls.

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
- `pending.cost` — `true` when pending line or discount mutations can leave totals stale.
- `pending.note` — `boolean` indicating whether a note save is in flight.
- `pending.attributes` — `boolean` indicating whether a complete attribute-list update is in flight.

Any value whose entity is in a pending set is **optimistic and unconfirmed**. The UI must treat it differently from confirmed values.

`state.revalidating` is `true` while the store refreshes authoritative cart-wide fields after overlapping mutations. Treat totals as unconfirmed and suppress cart analytics while it is true.

## Error state

`state.errors` is scoped to the entity that caused the error:

- `errors.lines` — `Map<string, CartErrorGroup>` keyed by line ID.
- `errors.discountCodes` — `Map<string, CartErrorGroup>` keyed by discount code string.
- `errors.note` — `CartErrorGroup` for note-related errors.
- `errors.attributes` — `Map<string, CartErrorGroup>` keyed by attribute key.
- `errors.cart` — `CartErrorGroup` for cart-level errors not attributable to a specific entity.
- `errors.network` — `CartNetworkEntry[]` for transport failures (timeouts, HTTP errors).
- `errors.lastUpdatedAt` — timestamp of the most recent error update across any scope. Per-scope timestamps also exist (`linesUpdatedAt`, `discountCodesUpdatedAt`, `attributesUpdatedAt`, etc.).

Each `CartErrorGroup` contains `{ userErrors: CartUserError[], warnings: CartWarning[] }`.

Errors survive unrelated cart work and clear when a new mutation begins for the same key.

---

## Rules

### Money

- **NEVER calculate currency amounts on the client.** Display server-provided amounts (`line.cost.totalAmount`, `state.data.cost.subtotalAmount`, etc.) directly. Client-side arithmetic drifts from the truth when discounts, taxes, duties, or rounding apply. If a value is stale because a mutation is in-flight, show it with pending UI — not a client-computed estimate.
- **Format with Hydrogen money helpers**, not string concatenation. Use the local `hydrogen-money` skill for an app wrapper around `formatMoney()`. The store provides `amount` (string) and `currencyCode` (string).

### Optimistic interactions

- **Keep rapid-action controls interactive during pending state.** Increase, decrease, remove, apply, and remove-discount controls must remain interactive. The store's abort-controller pattern makes concurrent mutations safe — a new click supersedes the in-flight request. A save-style editor, such as a gift-message attribute form, may disable its own submit button while its scoped mutation is pending when duplicate saves provide no value. Disabling for a non-pending reason is also fine — for example, the decrease control may be disabled when the quantity is already `<= 1`.
- **Inventory-aware set-quantity clamping is opt-in.** The default cart query does not request `ProductVariant.quantityAvailable` because that field requires the `unauthenticated_read_product_inventory` Storefront API scope. If a cart UI needs the entered quantity to clamp to sellable inventory before submission, add `quantityAvailable` to the app's custom cart fragment and enable the Hydrogen channel's product inventory permission (`unauthenticated_read_product_inventory`). Without that field, let Shopify validate inventory and surface the returned line error.
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

### Cart attribute editing

- **Treat an attribute update as complete-list replacement.** `attributes-update` sends the full next attribute list; attributes omitted from the submission are removed. When editing one attribute, explicitly include every unrelated existing attribute as a hidden keyed `attributeValue` field. Submit no attribute fields to clear all attributes.
- **Keep each key attached to its value.** Pass the attribute key to every `register("attributeValue", {key, ...})` call. The generated `attributes.<key>` field name encodes that key, so the server never relies on parallel field positions. Storefront API mutation inputs require string values, so normalize a nullable returned value deliberately (usually to `""`) before resubmitting it.
- **Use the register contract exactly.** Call `register("attributeValue", {key, ...})` rather than spelling its generated `attributes.<key>` field name by hand. The submit intent is kebab-case (`attributes-update`) because action intents follow the existing `discount-apply`, `discount-remove`, and `note-update` convention.
- **Maintain a local draft** for an editable attribute when the UI can remain mounted across server responses. Only sync confirmed attribute data into that draft while `pending.attributes` is `false`, so a response does not clobber typing that happened during the request.
- **Show scoped pending and errors.** Use `pending.attributes` for the save state and display entries from `errors.attributes` next to the editor for the matching key. A save-style submit button may be disabled until the attribute promise settles.

### Form structure

- **Each line item is its own form.** This gives each line its own identity input and its own submit buttons. A single form containing multiple lines creates ambiguity about which line an action targets.
- **Each line item form must preserve the progressive-enhancement shape.** The rendered structure will vary by framework and design system, but every line item quantity form needs the same Hydrogen contract: `register("set")`, `register("lineId", { value: line.id })`, and a real editable quantity input using `register("quantity", { value: line.quantity, interactive: true })`. Increase, decrease, and remove buttons are additional submit controls, not replacements for the set intent or the quantity input.
- **The `set` control is a hidden submit button, not a hidden input.** `register("set")` already returns `{ type: "submit", hidden: true }`; render it on a `<button>`. Do not swap it for `<input type="hidden">` — that removes the submit button, so pressing Enter in the quantity input no longer submits the set action.
- **Each discount "remove" button is its own form** — separate from the "apply" form. The apply form needs input validation (empty/duplicate prevention); each remove form is a single action.
- **Attribute forms submit keyed values.** Render one `register("attributeValue", {key, value})` control for every attribute in the complete next list, then submit with `register("attributes-update")`.

### Loading

- **While `loading` is `true`**, show skeleton placeholders — not empty state. The cart hasn't been fetched yet.
- **When `loading` is `false` and `lines` is empty**, show empty state ("Your cart is empty" or equivalent).
- **If resolved `initialData` is provided** when creating the store, `loading` starts as `false` and the initial fetch is skipped. `initialData` is the cart handler data envelope (`{cart, errors?}`), not only the cart object. Use resolved data when the response should include full cart HTML. **If promise `initialData` is provided**, `loading` starts as `true`, `state.readyPromise` tracks readiness, and `useSuspenseCart` can suspend cart content while the app shell stays non-blocking. Use promises when the backend can stream them into the HTML response. `{cart: null}` means the server already completed the bootstrap with no usable cart, so the UI should render empty state without a browser retry. `undefined` means no server bootstrap was provided, so the store fetches `/api/cart` after hydration; use this only when a client-side fetch is acceptable, such as an SPA. Cart server handlers log bootstrap errors before returning them, so app loaders should forward handler data instead of logging or throwing those errors again.

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

### Cart attributes

17. **Save attribute** — Edit an attribute and submit. The optimistic value appears immediately, `pending.attributes` is `true`, and the editor shows a saving state until confirmation.
18. **Preserve unrelated attributes** — Saving one attribute includes all unrelated existing key/value pairs; those attributes remain after the server response.
19. **Clear attributes** — Submitting an empty attribute list removes every cart attribute.
20. **Failure rollback** — If the update fails, the complete attribute list returns to the last confirmed baseline.
21. **Attribute-scoped error** — An error for a key appears next to that key's editor and marks its input invalid.
22. **No draft clobber** — Typing that occurs while an attribute save is pending is not overwritten by the confirming response.

### Error banner

23. **Network error** — When a mutation fails due to a transport error, a banner appears with the error message and a dismiss control.
24. **Cart-level error** — Errors not attributable to a line, code, note, or attribute appear in the banner.
25. **Orphaned line error** — If a line no longer exists in `state.data.lines.nodes` but `errors.lines` has an entry for its ID, that error appears in the banner.
26. **Dismiss and re-trigger** — Dismissing the banner hides it. A subsequent error (with a newer `lastUpdatedAt`) re-shows it.

### Totals

27. **Pending totals** — While any line or discount mutation is in-flight, subtotal and total appear in their pending visual state. The amounts shown are the last server-confirmed values — never client-computed.
28. **Settled totals** — After an ordinary mutation settles, totals display the latest server values. Overlapping mutation bursts retain pending styling and the last trustworthy amounts while one authoritative cart refresh is in flight.

### Loading

29. **Initial load** — Before the cart is fetched, show skeleton placeholders.
30. **Empty cart** — After fetch completes with zero lines, show empty state.

---

## Anti-patterns

- **Hand-rolled framework cart state.** If the skill has a matching framework reference, use its provider/hooks/helpers. Otherwise, use the core store directly instead of duplicating cart data in component state or custom reducers.
- **Client-seeded `/cart` page.** Mounting `CartProvider` with no `initialData` (or reading the cart only through a `"use client"` `useCart` hook) leaves the SSR HTML empty, so the `/cart` page cannot render the server cart. Read the cart in the server data path and pass `initialData`. Use resolved `initialData` when strict no-JS live cart HTML is required; use promise `initialData` when the framework can stream and hydrated cart content is wrapped in Suspense.
- **Quantity as text only.** Rendering quantity as a `<span>` with only plus/minus buttons breaks the set-quantity path and the no-JS fallback. Use a real input wired with `register("quantity", { value, interactive: true })`.
- **Plus/minus-only line forms.** Increase/decrease/remove buttons do not replace `register("set")` and the interactive quantity input. Omitting them breaks the form invariant even if hydrated clicks appear to work.
- **Drawer-specific line form drift.** The cart drawer may have a different layout from the `/cart` page, but its line item forms must keep the same Hydrogen form contract. Prefer sharing line item form components between the page and drawer.
- **Banner-only errors.** A line-level error displayed far from the line it refers to is effectively invisible. Show inline first; promote to the banner only when there's no inline target.
