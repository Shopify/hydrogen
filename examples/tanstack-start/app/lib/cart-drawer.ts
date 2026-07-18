export const CART_DRAWER_ID = "cart-drawer";
const STANDARD_ACTIONS_READY_EVENT = "DOMContentLoaded";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

function getCartDrawer() {
  if (typeof document === "undefined") return null;

  const drawer = document.getElementById(CART_DRAWER_ID);
  return drawer instanceof HTMLDialogElement ? drawer : null;
}

/** Open the cart drawer (`<dialog>` + `showModal()`). */
export function openCartDrawer() {
  const drawer = getCartDrawer();
  if (!drawer || drawer.open) return;
  drawer.showModal();
}

/** Close the cart drawer. */
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
