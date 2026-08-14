---
name: hydrogen-cart-drawer
description: >
  Guide for building an accessible cart drawer using @shopify/hydrogen. Use when
  creating or reviewing a cart drawer, mini cart, or slide-out cart, including
  native dialog element (showModal), closedby light dismiss, body scroll lock, exit
  animations, and wiring window.Shopify.actions.openCart().
---

# Cart Drawer

Build an accessible cart drawer that opens from the edge of the viewport and integrates with Standard Actions so any code can open it via `window.Shopify.actions.openCart()`.

---

## 1. Prerequisites

Before building the cart drawer, these must be in place:

- **Shopify runtime scripts** — render `ShopifyScripts` once in the root document, or use `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in framework-agnostic heads plus `initializeShopifyScripts({ routes: routeTemplates })` during browser hydration. Use the local `hydrogen-routing` skill for the required routing options. The drawer uses `window.Shopify.actions.openCart()` from that runtime.
- **`/cart` route** — the full cart page, used as the fallback route when the drawer is unavailable. For strict no-JS live cart HTML, the cart route must receive resolved cart `initialData`.

---

## 2. Drawer structure

The drawer has three layout zones (header / body / footer):

1. **Header** — title, close button, and error banner (if any cart errors exist). Always visible, never scrolls.
2. **Body** — line items only. This is the only zone that scrolls when content overflows.
3. **Footer** — discount codes, order note and/or cart attribute editors, totals, and checkout button. Always visible (pinned to bottom), never scrolls.

**Empty state**: When the cart has no items, the body shows an empty message ("Your cart is empty") and the footer is hidden entirely — no totals, no discounts, no notes, no checkout button.

The drawer is a `<dialog>` (or primitive library equivalent) rendered once in the root layout. The storefront must also have a `/cart` route that renders a full cart page — this is the fallback route when the drawer is unavailable. The drawer is the progressively-enhanced experience that layers on top after hydration.

The full `/cart` page shares the same content components (line items, discounts, note, attributes, totals, checkout) but uses a page layout instead of the fixed header/body/footer zones.

The drawer's line item forms must use the same Hydrogen line-item form contract as the `/cart` page — see `hydrogen-cart-ui` ("Form structure"). The layout may differ by framework and design system; the form contract must not.

---

## 3. Accessibility

See `references/accessibility.md` for the full dialog accessibility spec grounded in the WHATWG HTML specification.

### Must implement (not provided by `<dialog>`)

At-a-glance index — full treatment lives where each concern is implemented:

1. **Body scroll lock** — pure CSS, no JS class toggling (see §6)
2. **Backdrop click dismissal** — native light dismiss via `<dialog closedby="any">` (see §5)
3. **Exit animation** — `@starting-style` / discrete transitions (see §6)

### Provided by `<dialog>` + `showModal()`

These are free — **do not reimplement them**: focus containment (background `inert`), focus restoration to the trigger on `close()`, Escape dismissal, `::backdrop` overlay, and implicit `aria-modal="true"`. See `references/accessibility.md` for the full table and how each works.

### Required markup

```html
<dialog aria-labelledby="cart-drawer-title">
  <h2 id="cart-drawer-title">Cart</h2>
  <!-- drawer content -->
</dialog>
```

All interactive elements inside the drawer must be `<button>` or `<input>` elements — not `<div>` or `<span>` with click handlers.

---

## 4. Dialog primitive recommendation

**Default**: use native `<dialog>` with `showModal()`. It gives you most accessibility behaviors for free and avoids adding a dependency.

Use a primitive library only when the app already depends on one for dialog-like UI and wants that library's controlled-state or animation model. The accessibility requirements in `references/accessibility.md` are identical regardless of approach.

---

## 5. Open/close behavior

### Opening the drawer

The cart trigger renders in SSR as `<a href="/cart">Cart</a>` so it works before hydration and without JavaScript (the anchor navigates to the full `/cart` page). After hydration, an `onClick` calls `e.preventDefault()` then `openCartDrawer()` (which calls `showModal()`), so the click opens the drawer instead of navigating; no `hasHydrated` swap is needed — the anchor is the no-JS baseline and the `onClick` is the enhancement.

Keep the drawer as hydrated progressive enhancement. Do not make the drawer itself the fallback route; the `/cart` page is that full-page fallback.

```tsx
export const CART_DRAWER_ID = "cart-drawer";
const STANDARD_ACTIONS_READY_EVENT = "DOMContentLoaded";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

function getCartDrawer() {
  if (typeof document === "undefined") return null;

  const drawer = document.getElementById(CART_DRAWER_ID);
  return drawer instanceof HTMLDialogElement ? drawer : null;
}

export function openCartDrawer() {
  const drawer = getCartDrawer();
  if (!drawer || drawer.open) return;
  drawer.showModal();
}

export function closeCartDrawer() {
  getCartDrawer()?.close();
}

function configureOpenCartActionNow() {
  const openCart = typeof window !== "undefined" ? window.Shopify?.actions?.openCart : undefined;
  if (!openCart) return false;

  openCart.configure({
    handler: async () => openCartDrawer(),
  });
  openCartActionConfigured = true;
  return true;
}

export function configureOpenCartAction() {
  if (typeof document === "undefined" || openCartActionConfigured) return;
  if (configureOpenCartActionNow()) return;
  if (openCartActionRetryQueued || document.readyState !== "loading") return;

  openCartActionRetryQueued = true;
  document.addEventListener(
    STANDARD_ACTIONS_READY_EVENT,
    () => {
      openCartActionRetryQueued = false;
      configureOpenCartAction();
    },
    { once: true },
  );
}

configureOpenCartAction();
```

The module-scope `configureOpenCartAction()` call is intentional. It no-ops during SSR, configures immediately when Standard Actions is already available, and retries once on `DOMContentLoaded` when the runtime loads after this module.

Render the drawer once in the root layout. Use explicit JavaScript open/close helpers for app-owned controls.

```tsx
import { CART_DRAWER_ID, closeCartDrawer } from "~/lib/cart-drawer";

function CartDrawer() {
  return (
    <dialog id={CART_DRAWER_ID} aria-labelledby="cart-drawer-title" closedby="any">
      <h2 id="cart-drawer-title">Cart</h2>
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCartDrawer}
      >
        Close
      </button>
      {/* cart content */}
    </dialog>
  );
}
```

The drawer opens from three surfaces. The cart trigger is the canonical one; the other two reuse the same helper.

**1. The cart trigger.** A `/cart` anchor with an `onClick` that opens the drawer after hydration. It carries the accessibility attributes `aria-controls` and `aria-haspopup="dialog"`:

```tsx
return (
  <a href="/cart" onClick={(e) => { e.preventDefault(); openCartDrawer(); }} aria-controls={CART_DRAWER_ID} aria-haspopup="dialog">
    Cart
  </a>
);
```

**2. `window.Shopify.actions.openCart()`** — the Standard Action for programmatic opening, so external code (Standard Actions tools, agents, third-party components) can open the drawer. Register the same stable DOM helper as the `openCart` handler (see §8 for the handler-permanence caveat).

```js
window.Shopify.actions.openCart();
```

**3. From add-to-cart** — when the canonical cart trigger is an anchor, open the drawer immediately with optimistic state so pending cart contents remain inspectable. Opening only after success is compatible with the storefront contract only when the page also provides a visible button that opens the drawer while the mutation is pending.

```tsx
<form {...formProps({ beforeSubmit: openCartDrawer })}>
  {/* add-to-cart controls */}
</form>
```

Validate before calling the drawer helper — for example, call `event.preventDefault()` and return if the quantity is invalid. Do not push this policy into core cart mutations; some storefronts want a toast, a cart page navigation, or no automatic UI change.

### Closing the drawer

Native: Escape and the back gesture (fires `cancel` then `close`). App-provided: the explicit close `<button>` in the header (`aria-label="Close cart"`). Backdrop (light dismiss) requires `<dialog closedby="any">`.

`closedby="any"` is the least compatible part of this pattern. Browsers without `closedby` support will ignore the attribute, so the drawer will still close from Escape and the explicit close button, but backdrop click will not close it. Do not provide a polyfill for `closedby` unless the app explicitly requires backdrop click support in those browsers.

If an app does require that polyfill, use a pointerdown-plus-click guard on the `<dialog>` itself: record whether `pointerdown` started on the dialog backdrop, then close only when the following `click` also targets the dialog. Do not close on a plain `click.self` alone, because a drag that starts inside the drawer and ends on the backdrop can produce an accidental close.

### State management

Open/close is DOM state owned by the `<dialog>` element. Prefer `dialog.showModal()` and `dialog.close()` over duplicating open state in framework state unless a primitive library requires controlled state.

For custom logic, listen to native dialog events instead of duplicating state. Use `toggle` to react after the drawer opens or closes. Use `beforetoggle` with `event.preventDefault()` when the app needs to intercept opening, run custom work such as an animation, and then call `showModal()` manually later.

---

## 6. CSS and animation

See `references/css.md` for the reference drawer shell, entry/exit animation, backdrop, and scroll-lock CSS. In Tailwind apps, keep the dialog shell, `::backdrop`, `@starting-style`, and scroll-lock rules in global CSS or a project `@layer`; use utilities for the drawer's internal content layout.

---

## 7. Verify

After building the cart drawer, test:

- [ ] Cart trigger is a `/cart` anchor pre-hydration; after hydration its `onClick` opens the drawer via `showModal()`
- [ ] If a no-JS fallback is required, it navigates to `/cart` without JavaScript
- [ ] `window.Shopify.actions.openCart()` opens drawer (test from browser console)
- [ ] Drawer closes via Escape, backdrop click (with `closedby="any"`), and the close button
- [ ] Focus returns to the cart icon after close
- [ ] Tab cycles only through elements inside the drawer while open
- [ ] Screen reader announces "Cart" (or equivalent title) on drawer open
- [ ] While cart data loads, the title and close button remain available and the loading status is announced
- [ ] Drawer line item forms use the same `hydrogen-cart-ui` progressive form contract as the `/cart` page

---

## 8. Common gotchas

- **`openCart` handler is permanent** — `openCart.configure({ handler })` has no corresponding `unconfigure()`. Once registered, the handler persists for the page lifetime. This is fine when the drawer lives in the root layout. Avoid handlers that close over component refs that can go stale during HMR; prefer a small stable helper that looks up `dialog#cart-drawer` and calls `showModal()`.

- **Astro view transitions** — if the drawer is vanilla JS (like the base example), it must be re-initialized after view transition navigations. Listen for `astro:after-swap`.

- **Cart selectors must be stable** — don't derive arrays or objects inside a cart selector unless the binding accepts an equality function. Select store references such as `state.errors` or `state.data.lines.nodes` and derive banner messages outside the selector with the framework's memoization primitive.

---

## 9. Anti-patterns

- **Drawer as a route instead of overlay** — the drawer is overlay UI in the root layout and must be available on every page; the `/cart` route is the full cart page, not the drawer (see §2).

- **`dialog.show()` instead of `showModal()`** — `show()` does not get top-layer rendering, focus containment, `inert` on background, or `::backdrop`. Always use `showModal()`.

- **Text-only drawer quantities** — rendering line quantities as text with only plus/minus controls breaks the progressive set-quantity path; use the same editable quantity input contract as the `/cart` page (see `hydrogen-cart-ui`).
