# Cart drawer core notes

This note maps the cart-drawer reference to the regenerated framework implementation. The cart drawer is app-owned chrome: it is opened from the header cart trigger on every page and is the primary surface for reviewing and editing the cart without leaving the current route.

Two reference artifacts back this surface, and they are complementary:

- `reference/_partials/header.html` carries the **live** cart drawer — the real `<dialog id="cart-drawer">` overlay, wired to the header cart trigger via native Invoker Commands (`commandfor="cart-drawer"` / `command="show-modal"`). It is inlined into all five reference pages and shows the populated happy-path state so the trigger has a real target.
- `reference/cart-drawer.html` is the **state catalog**: empty, single line, multiple lines, the in-drawer quantity control, a sale / compare-at line, and the updating / removed / error live-region states, framed inline side by side. It is the authoritative reference for the states the live drawer cycles through. (It carries the standard shared chrome only because every `reference/*.html` page does; the catalog is in its `<main>`.)

Treat the drawer as a first-class surface with its own contract — not as header boilerplate to copy verbatim.

## Translate idiomatically

Do **not** transliterate the drawer markup line-for-line.

- Use the shipped Hydrogen/Storefront Kit **cart UI / cart drawer** skills for cart lines, optimistic updates, line quantity/remove mutations, totals, checkout URL, and live-region messaging.
- `<s-cart>`, `<s-dialog>`, and `<s-quantity-selector>` are **behavioral spec only** — DOM roles and required behavior, not JavaScript to port. Replace them with framework state/components.
- Keep the semantic classes from `tokens.css` (`cart-count-badge`, `drawer-right`, `divide-border`, `quantity-selector-outlined`, `rounded-input`, `text-sale`, `text-compare`, the line grid `grid-cols-[var(--spacing-cart-line-thumbnail-width)_1fr_auto]`) as the cross-example consistency anchor.
- Replace all demo data (titles, variants, prices, thumbnails, counts, totals) with real cart line data.
- **Caching:** cart is per-user, personalized state — request-scoped and uncached (engineering.md §F2). It must not be fetched in a server root layout path that poisons the shared shell (§F1). Seed the cart provider from the server data path so the very first server render is populated (see "Without JavaScript" below).

## States (reference → contract)

| Reference state | Generated example responsibility |
| --- | --- |
| **Empty** | When `totalQuantity === 0`: render `cart.empty` ("Your cart is empty.") + `cart.emptyDescription`, hide the count badge and the totals footer, and offer a continue-shopping/close action. Do not render an empty line list or a `$0.00` total. |
| **Single line** | One line: thumbnail (with alt = product + variant), title, variant subtitle, line price, an in-drawer quantity control, and a remove control. Footer shows `cart.totalLabel` + total + `cart.taxesAndShippingAtCheckout` + the checkout CTA pointing at the real `checkoutUrl`. |
| **Multiple lines** | Lines separated by `divide-border`; the count badge reflects `totalQuantity` (sum of line quantities, not line count); the footer total reflects all lines. |
| **In-drawer quantity control** | Reuse the PDP `<s-quantity-selector>` pattern on the line, placed on **its own row below the line price** inside the content column (never in the price row). The +/- buttons are `.button-icon` (44px touch targets — do NOT hand-size them with raw `size-9`/`size-11`); the control reads compact by **narrowing the number field** (`h-11 w-8`) and tightening spacing, not by shrinking the tap targets. Decrement disabled at the minimum, increment up to stock, submitted quantity authoritative. Per-line aria labels disambiguate (`Decrease quantity: <title>`). Hydrogen's `register("quantity", { interactive: true })` keeps a no-JS line update path. |
| **Sale / compare-at** | Sale price in `text-sale`, struck regular price in `<s class="text-compare">`, matching the PDP price treatment. Only render compare-at when the line variant actually has one. |
| **Updating** | While a line mutation is in flight: dim + `aria-busy="true"` on the affected line, disable its controls, and announce `cart.updated` ("Cart updated", `data-updated-message`) in the polite live region. |
| **Removed** | After removal, announce `cart.itemRemoved` ("Item removed from cart", `data-removed-message`). If the removed line was the last, fall back to the empty state. |
| **Error** | On a failed mutation, preserve the prior line state (no optimistic data loss) and render the message with `role="alert"` using `cart.updateError` ("Could not update cart. Please try again.", `data-update-error`). |

## Line-item structure (locked)

Every cart line the **framework implements** — the app cart drawer and every catalog state — reproduces one canonical structure verbatim; frameworks translate it idiomatically but must not restructure it. (The `<s-cart>` block in the header partial is a platform web-component *preview* — behavioral spec only, per the note above — and intentionally shows a simplified, stepper-less line; frameworks replace `<s-cart>` with their own state/components that reproduce the locked structure below, including the stepper.)

- **Grid.** `grid grid-cols-[var(--spacing-cart-line-thumbnail-width)_1fr_auto] items-stretch gap-3 py-4` — three tracks: thumbnail / content / remove. Use `items-stretch` (NOT `items-start`) so the thumbnail cell fills the full line height.
- **Thumbnail (track 1).** `bg-surface-secondary h-full w-full overflow-hidden` wrapping an `h-full w-full object-cover` image. Because the cell stretches, the image spans the **full card height** at its own aspect ratio (cropped via `object-cover`), rather than being pinned to a short fixed square. Do NOT constrain it with `aspect-portrait` here — that would cap the height back to the thumbnail width.
- **Content (track 2, `min-w-0`).** Title, variant subtitle, then the line price; the quantity stepper is its **own row below the price**, not in the price row.
- **Stepper buttons.** `.button-icon` (44px floor, opacity hover that works on the `<img>` glyph); the number field is narrowed (`h-11 w-8`) so the whole control reads smaller while keeping the buttons at the AA tap-target size.
- **Remove (track 3).** A `.button-icon` (with `self-start` so it stays top-aligned in the stretched row), NOT a raw `size-11` box with `hover:text-*` on an `<img>` (that hover is inert — see conventions §8). `.button-icon` gives it the opacity hover + 44px floor.

## Behavioral hooks

The `<s-cart>` element declares the messages and partials the cart UI uses; carry the same contract into the framework implementation rather than inventing new copy:

- `data-partials="cart-drawer,cart-count"` — the regions re-rendered after a mutation (the drawer body and the header count badge stay in sync).
- `data-removed-message`, `data-updated-message`, `data-update-error` — the three status strings, sourced from `content.json` `cart.itemRemoved` / `cart.updated` / `cart.updateError`.
- `data-cart-status` marks the polite `aria-live` status region inside the drawer; the header also keeps its own `aria-live` count announcement (`cart.itemCount`).
- Remove uses `command="--remove"` against the cart region; quantity uses `command="--step-up"` / `--step-down` against the line's selector id. These are behavioral hints — bind them to the framework's cart mutation actions.

## Accessibility

- The drawer is a labelled dialog (`aria-labelledby="cart-drawer-title"`); the trigger announces a pluralized label (`cart.iconLabel` — "Cart (1 item)" / "Cart ({{ count }} items)").
- Status changes (added, updated, removed) post to a polite live region; errors use `role="alert"` (assertive).
- The count badge is decorative (`aria-hidden`); the authoritative count is the live-region text using `cart.itemCount`.
- Each per-line control names its line (`Remove: <title>`, `Increase quantity: <title>`) so screen-reader users can tell lines apart.

## Without JavaScript

The cart drawer is a progressive-enhancement overlay; it must never be the **only** way to reach or read the cart (engineering.md §F4):

- The header cart trigger is a **native Invoker button** — `<button command="show-modal" commandfor="cart-drawer">` — that opens the drawer with **no JavaScript** on supporting browsers (Pattern A). It is **not** an `<a href="/cart">` that only enhances to a button after hydration; that enhancing-anchor pattern is forbidden because it leaves the cart dead on any unhydrated page (the icon silently full-page-navigates instead of opening the drawer).
- The no-JS path to **read** the full cart is a real `/cart` link in the **footer** (site chrome), reachable on every page — not an `href` on the trigger. The drawer opens via native Invoker Commands (`command="show-modal"`) where supported, with an `onClick`/`showModal()` fallback once hydrated. Where Invoker Commands are unavailable and the page has not hydrated, the footer's `/cart` link is the fallback — so `/cart` must render the cart **server-side** (see the cart-page contract in `notes/product.md`; the standalone `/cart` page itself remains out of scope for this core, but the server-rendered cart requirement is not).
- Seed the cart provider from the server data path (root loader / server component) so the first server render is populated; a client-only cart read renders an empty cart without JS even when the cart is not empty.
- Line quantity/remove keep a native form path (Hydrogen's `register("quantity", { interactive: true })`) so a no-JS shopper can still update the cart.

## Out of scope

The standalone `/cart` **page** layout is out of scope for this core (as noted in `product.md`); the drawer is the in-context cart surface. The server-rendered-cart *requirement* above still applies wherever `/cart` is implemented, because it is the drawer's declared no-JS fallback.
