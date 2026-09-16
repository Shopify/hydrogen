export const CART_DRAWER_ID = "cart-drawer";
export const CART_DRAWER_CLOSE_ID = "cart-drawer-close";
export const MOBILE_NAV_DRAWER_ID = "mobile-nav-drawer";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

function getDialog(id: string): HTMLDialogElement | null {
  if (typeof document === "undefined") return null;
  const dialog = document.getElementById(id);
  return dialog instanceof HTMLDialogElement ? dialog : null;
}

function supportsDialogCommands(): boolean {
  if (typeof HTMLButtonElement === "undefined") return false;
  return (
    "command" in HTMLButtonElement.prototype && "commandForElement" in HTMLButtonElement.prototype
  );
}

export function openDialog(id: string): void {
  const dialog = getDialog(id);
  if (!dialog || dialog.open) return;
  dialog.showModal();
}

export function closeDialog(id: string): void {
  getDialog(id)?.close();
}

export function openCartDrawer(): void {
  openDialog(CART_DRAWER_ID);
}

export function closeCartDrawer(): void {
  closeDialog(CART_DRAWER_ID);
}

export function openMobileNavDrawer(): void {
  openDialog(MOBILE_NAV_DRAWER_ID);
}

export function closeMobileNavDrawer(): void {
  closeDialog(MOBILE_NAV_DRAWER_ID);
}

export function openDialogFallback(id: string): void {
  if (supportsDialogCommands()) return;
  openDialog(id);
}

function isFocusOrphaned(): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body || active === document.documentElement) {
    return true;
  }
  return !active.isConnected || active instanceof HTMLDialogElement;
}

export function restoreCartDrawerFocus(): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const dialog = getDialog(CART_DRAWER_ID);
    if (!dialog?.open || !isFocusOrphaned()) return;
    document.getElementById(CART_DRAWER_CLOSE_ID)?.focus();
  });
}

function configureOpenCartActionNow(): boolean {
  const openCart = typeof window !== "undefined" ? window.Shopify?.actions?.openCart : undefined;
  if (!openCart) return false;

  openCart.configure({
    handler: async () => openCartDrawer(),
  });
  openCartActionConfigured = true;
  return true;
}

export function configureOpenCartAction(): void {
  if (typeof document === "undefined" || openCartActionConfigured) return;
  if (configureOpenCartActionNow()) return;
  if (openCartActionRetryQueued || document.readyState !== "loading") return;

  openCartActionRetryQueued = true;
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      openCartActionRetryQueued = false;
      configureOpenCartAction();
    },
    { once: true },
  );
}

configureOpenCartAction();
