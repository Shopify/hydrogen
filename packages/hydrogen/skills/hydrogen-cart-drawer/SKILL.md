---
name: hydrogen-cart-drawer
description: >
  Guide for building an accessible cart drawer using @shopify/hydrogen. Use this skill whenever creating a cart drawer in your storefront.
---

# Cart Drawer

Build an accessible cart drawer that opens from the edge of the viewport and integrates with Standard Actions so any code can open it via `window.Shopify.actions.openCart()`.

---

## 1. Prerequisites

Before building the cart drawer, these must be in place:

- **Standard Actions** — the Shopify script that provides `window.Shopify.actions.openCart`
- **`/cart` route** — the full cart page, used as the no-JS fallback for progressive enhancement

---

## 2. What you're building

```
┌─────────────────────────────────┐
│ HEADER (fixed)                  │
│  "Cart" (h2)                [X] │
│  [error banner, if any]         │
├─────────────────────────────────┤
│                                 │
│ BODY (scrollable)               │
│  Line item 1                    │
│  Line item 2                    │
│  ...                            │
│                                 │
├─────────────────────────────────┤
│ FOOTER (fixed)                  │
│  Discount code input            │
│  Order note                     │
│  Subtotal / Total               │
│  [Checkout]                     │
└─────────────────────────────────┘
```

The drawer has three layout zones:

1. **Header** — title, close button, and error banner (if any cart errors exist). Always visible, never scrolls.
2. **Body** — line items only. This is the only zone that scrolls when content overflows.
3. **Footer** — discount codes, order note, totals, and checkout button. Always visible (pinned to bottom), never scrolls.

**Empty state**: When the cart has no items, the body shows an empty message ("Your cart is empty") and the footer is hidden entirely — no totals, no discounts, no notes, no checkout button.

The drawer is a `<dialog>` (or primitive library equivalent) rendered once in the root layout. The storefront must also have a `/cart` route that renders a full cart page — this is the no-JS fallback. The drawer is the progressively-enhanced experience that layers on top after hydration.

The full `/cart` page shares the same content components (line items, discounts, note, totals, checkout) but uses a page layout instead of the fixed header/body/footer zones.

---

## 3. Accessibility

See `references/accessibility.md` for the full dialog accessibility spec grounded in the WHATWG HTML specification.

### Must implement (not provided by `<dialog>`)

1. **Body scroll lock** — `body:has(dialog#cart-drawer[open]) { overflow: hidden; }` — pure CSS, no JS class toggling needed
2. **Backdrop click dismissal** — prefer native light dismiss with `<dialog closedby="any">`
3. **Exit animation** — CSS `@starting-style` or JS-deferred close (dialog leaves top-layer immediately on `close()`)

### Provided by `<dialog>` + `showModal()`

These are free — do not reimplement them:

- Focus containment (background becomes `inert`)
- Focus restoration to trigger element on `close()`
- Escape key dismissal
- `::backdrop` overlay
- Implicit `aria-modal="true"`

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

The cart trigger in the navbar should render as an `<a href="/cart">` before hydration, then enhance to a `<button>` that opens the drawer after hydration. This keeps the no-JS path simple: buyers navigate to the full `/cart` route, which must server-render cart items.

Avoid relying on `command="show-modal"` for no-JS drawer opening. That can open the drawer without JavaScript, but it also means the drawer content must always be server-rendered in the root layout. Prefer `/cart` as the no-JS fallback and keep the drawer as hydrated progressive enhancement.

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

  try {
    drawer.showModal();
  } catch {
    // Opening the drawer is progressive enhancement; cart mutations must still proceed.
  }
}

export function closeCartDrawer() {
  getCartDrawer()?.close();
}

export function supportsDialogCommands() {
  if (typeof HTMLButtonElement === "undefined") return false;

  return "command" in HTMLButtonElement.prototype && "commandForElement" in HTMLButtonElement.prototype;
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

Render the drawer once in the root layout. Prefer declarative `command` / `commandfor` controls for app-owned open/close buttons when your browser targets support them.

```tsx
import {
  CART_DRAWER_ID,
  closeCartDrawer,
  openCartDrawer,
  supportsDialogCommands,
} from "~/lib/cart-drawer";

const closeCartCommandAttributes = {
  command: "close",
  commandfor: CART_DRAWER_ID,
};

function CartDrawer() {
  return (
    <dialog id={CART_DRAWER_ID} aria-labelledby="cart-drawer-title" closedby="any">
      <h2 id="cart-drawer-title">Cart</h2>
      <button
        type="button"
        {...closeCartCommandAttributes}
        aria-label="Close cart"
        onClick={() => {
          if (!supportsDialogCommands()) closeCartDrawer();
        }}
      >
        Close
      </button>
      {/* cart content */}
    </dialog>
  );
}
```

**Badge count**: The cart icon typically shows a quantity badge. Cap the displayed count at **99** — show the number for 1–99, show "99+" for 100 or more. This keeps the badge visually compact (two digits max) and avoids layout shift from large numbers.

Three trigger paths (post-hydration):

1. **Cart trigger** — render `<a href="/cart">` before hydration, then render a button after hydration. Prefer `command="show-modal"` and `commandfor="cart-drawer"` for the hydrated button when browser targets match support.

   ```tsx
   const [hasHydrated, setHasHydrated] = useState(false);
   useEffect(() => setHasHydrated(true), []);

   return hasHydrated ? (
     <button
       type="button"
       aria-controls={CART_DRAWER_ID}
       aria-haspopup="dialog"
       command="show-modal"
       commandfor={CART_DRAWER_ID}
       onClick={() => {
         if (!supportsDialogCommands()) openCartDrawer();
       }}
     >
       Cart
     </button>
   ) : (
     <a href="/cart">Cart</a>
   );
   ```

2. **`window.Shopify.actions.openCart()`** — the Standard Action for programmatic cart opening. The drawer must register the same DOM helper as the `openCart` handler so that external code (Standard Actions tools, agents, third-party components) can open it.

   ```js
   window.Shopify.actions.openCart();
   ```

   `.configure()` is a one-time registration with no undo API. Keep the handler stable and independent of framework refs by looking up `dialog#cart-drawer` by ID.

   Use `window.Shopify.actions.openCart()` for external integrations that only need to open the cart. Keep the local JavaScript helper for programmatic opens; `command` only handles user-activated buttons.

3. **After add-to-cart submit succeeds** — if the product UX should open the drawer after a successful add, pass the same local helper to the product form's submit hooks.

   ```tsx
   <form {...formProps({ afterSubmit: openCartDrawer })}>
     {/* add-to-cart controls */}
   </form>
   ```

   This opens the drawer only after the mutation succeeds. Keep validation and cancellation in `beforeSubmit`; for example, call `event.preventDefault()` there if the quantity is invalid and the drawer should not open. Do not push this policy into core cart mutations; some storefronts want a toast, a cart page navigation, or no automatic UI change.

### Native command attributes

Modern browsers support declarative dialog triggers. Prefer this over `onClick={() => dialog.showModal()}` for app-owned open/close buttons when your browser targets match support on [Can I use](https://caniuse.com/?search=command):

```html
<button command="show-modal" commandfor="cart-drawer">Open cart</button>
<dialog id="cart-drawer">
  <button command="close" commandfor="cart-drawer">Close</button>
</dialog>
```

You still need JavaScript for add-to-cart opening and for wiring `window.Shopify.actions.openCart()`. Keep one local drawer helper for those programmatic trigger paths, and use command attributes for direct buyer controls.

If your browser targets do not fully support Invoker Commands, keep the `command` / `commandfor` attributes and add a feature-detected click fallback that calls the same local helper only when `supportsDialogCommands()` is false. This keeps modern browsers on the platform path without breaking older Safari/iOS Safari.

React type packages lag the platform here. React support is tracked in [facebook/react#32478](https://github.com/facebook/react/issues/32478), and the DefinitelyTyped change is blocked on React support landing. If TypeScript rejects `command` or `commandfor`, spread a small command-attribute object into the button until the React types include them; avoid global React type augmentations unless the app already has a convention for platform type patches.

### Closing the drawer

- **Escape key** — native with `<dialog>` (fires `cancel` then `close` events)
- **Backdrop click** — native light dismiss with `<dialog closedby="any">`
- **Close button** — explicit `<button>` in the drawer header with `aria-label="Close cart"`

`closedby="any"` is the least compatible part of this pattern today. Older browsers and Safari versions that have not shipped `closedby` will ignore the attribute, so the drawer will still close from Escape and the explicit close button, but backdrop click will not close it. Do not provide a polyfill for `closedby` unless the app explicitly requires backdrop click support in those browsers.

If an app does require that polyfill, use a pointerdown-plus-click guard on the `<dialog>` itself: record whether `pointerdown` started on the dialog backdrop, then close only when the following `click` also targets the dialog. Do not close on a plain `click.self` alone, because a drag that starts inside the drawer and ends on the backdrop can produce an accidental close.

### State management

Open/close is DOM state owned by the `<dialog>` element. Prefer `dialog.showModal()` and `dialog.close()` over duplicating open state in framework state unless a primitive library requires controlled state.

For custom logic, listen to native dialog events instead of duplicating state. Use `toggle` to react after the drawer opens or closes. Use `beforetoggle` with `event.preventDefault()` when the app needs to intercept opening, run custom work such as an animation, and then call `showModal()` manually later.

---

## 6. CSS and animation

Reference CSS for the drawer shell:

```css
dialog#cart-drawer {
  position: fixed;
  inset-block: 0;
  right: 0;
  left: auto;
  margin: 0;
  width: 100%;
  max-width: 28rem;
  height: 100dvh;
  max-height: none;
  border: 0;
  padding: 0;
}
```

**Entry and exit animation**: slide in from the edge and let the dialog remain transitionable while closing.
```css
dialog#cart-drawer {
  transform: translateX(100%);
  transition:
    transform 250ms cubic-bezier(0.22, 1, 0.36, 1),
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}

dialog#cart-drawer[open] {
  transform: translateX(0);
}

@starting-style {
  dialog#cart-drawer[open] {
    transform: translateX(100%);
  }
}
```

**Backdrop**: fade in.
```css
dialog#cart-drawer::backdrop {
  background: rgb(0 0 0 / 0);
  transition:
    background-color 250ms ease-out,
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}
dialog#cart-drawer[open]::backdrop {
  background: rgb(0 0 0 / 0.3);
}

@starting-style {
  dialog#cart-drawer[open]::backdrop {
    background: rgb(0 0 0 / 0);
  }
}
```

**Scroll lock**:
```css
body:has(dialog#cart-drawer[open]) { overflow: hidden; }
```

Exact measurements and colors are not prescribed — the above matches the base example for reference. Adapt to the project's design system.

---

## 7. Verify

After building the cart drawer, test:

- [ ] Cart trigger opens drawer after hydration
- [ ] If a no-JS fallback is required, it navigates to `/cart` without JavaScript
- [ ] `window.Shopify.actions.openCart()` opens drawer (test from browser console)
- [ ] Escape closes drawer
- [ ] Backdrop click closes drawer
- [ ] Close button closes drawer
- [ ] Focus returns to the cart icon after close
- [ ] Tab cycles only through elements inside the drawer while open
- [ ] Screen reader announces "Cart" (or equivalent title) on drawer open

---

## 8. Common gotchas

- **`openCart` handler is permanent** — `openCart.configure({ handler })` has no corresponding `unconfigure()`. Once registered, the handler persists for the page lifetime. This is fine when the drawer lives in the root layout. Avoid handlers that close over component refs that can go stale during HMR; prefer a small stable helper that looks up `dialog#cart-drawer` and calls `showModal()`.

- **Backdrop click requires `closedby="any"`** — `<dialog>` opened with `showModal()` defaults to `closedby="closerequest"`, which handles Escape/back gestures but not light dismiss. Add `closedby="any"` when backdrop click should close the drawer, but remember that unsupported browsers ignore it. Older browsers and Safari still have the close button; they just do not get backdrop-click dismissal.

- **Closing animations need discrete transitions** — calling `dialog.close()` removes the dialog from the top layer immediately unless CSS uses `overlay` and `display` with `allow-discrete` (or you defer `close()` in JavaScript until the animation ends).

- **Open-on-add is a product UX decision** — prefer opening the drawer in `afterSubmit` so `beforeSubmit` can validate and cancel the submission with `event.preventDefault()`. Keeping this in the app makes the policy explicit.

- **Astro view transitions** — if the drawer is vanilla JS (like the base example), it must be re-initialized after view transition navigations. Listen for `astro:after-swap`.


- **React `useCart` selectors must be stable** — don't derive arrays or objects inside a `useCart` selector. Select store references such as `state.errors` or `state.data.lines.nodes` and derive banner messages with `useMemo`, or pass an explicit equality function.

---

## 9. Anti-patterns

- **Drawer as a route instead of overlay** — the drawer itself is overlay UI rendered in the root layout, not a routed page. The `/cart` route is the full cart page (the no-JS fallback), not the drawer. Don't render the drawer only on `/cart` — it must be available on every page.

- **`dialog.show()` instead of `showModal()`** — `show()` does not get top-layer rendering, focus containment, `inert` on background, or `::backdrop`. Always use `showModal()`.
