export const CART_DRAWER_ID = "cart-drawer";
const STANDARD_ACTIONS_READY_EVENT = "DOMContentLoaded";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

/* --- Drawer open-state store (for `aria-expanded` on the cart trigger) ---
   The drawer opens via `showModal()` and can close via `closeCartDrawer()`,
   the ESC key, or a backdrop click (all fire the `<dialog>` `close` event).
   `useSyncExternalStore`-compatible so `CartTrigger` can reflect real open
   state instead of a hardcoded value. */
let cartDrawerOpen = false;
const listeners = new Set<() => void>();
let closeListenerWired = false;

function notifyCartDrawerOpen() {
  for (const listener of listeners) listener();
}

function syncFromDrawer(drawer: HTMLDialogElement | null) {
  const next = drawer?.open ?? false;
  if (next !== cartDrawerOpen) {
    cartDrawerOpen = next;
    notifyCartDrawerOpen();
  }
}

function ensureCloseListener(drawer: HTMLDialogElement) {
  if (closeListenerWired) return;
  drawer.addEventListener("close", () => syncFromDrawer(getCartDrawer()), { passive: true });
  closeListenerWired = true;
}

export function subscribeCartDrawerOpen(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCartDrawerOpen() {
  return cartDrawerOpen;
}

function getCartDrawer() {
  if (typeof document === "undefined") return null;

  const drawer = document.getElementById(CART_DRAWER_ID);
  return drawer instanceof HTMLDialogElement ? drawer : null;
}

/** Open the cart drawer (`<dialog>` + `showModal()`). */
export function openCartDrawer() {
  const drawer = getCartDrawer();
  if (!drawer || drawer.open) return;
  ensureCloseListener(drawer);
  drawer.showModal();
  syncFromDrawer(drawer);
}

/** Close the cart drawer. */
export function closeCartDrawer() {
  const drawer = getCartDrawer();
  drawer?.close();
  syncFromDrawer(drawer);
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

/**
 * Register the drawer's DOM helper as the `window.Shopify.actions.openCart()`
 * Standard Action handler (`hydrogen-cart-drawer` skill). The module-scope call
 * no-ops during SSR, configures immediately when Standard Actions is available,
 * and retries once on `DOMContentLoaded` when the runtime loads after this
 * module.
 */
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
