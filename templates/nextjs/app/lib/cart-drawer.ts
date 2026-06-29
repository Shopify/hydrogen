"use client";

export const CART_DRAWER_ID = "cart-drawer";
export const MOBILE_NAV_DRAWER_ID = "mobile-nav-drawer";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

export function supportsDialogCommands(): boolean {
  if (typeof HTMLButtonElement === "undefined") return false;
  return "commandForElement" in HTMLButtonElement.prototype;
}

function getDialog(id: string): HTMLDialogElement | null {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(id);
  return element instanceof HTMLDialogElement ? element : null;
}

export function openDialog(id: string) {
  const dialog = getDialog(id);
  if (!dialog || dialog.open) return;
  dialog.showModal();
}

export function closeDialog(id: string) {
  getDialog(id)?.close();
}

export function openCartDrawer() {
  openDialog(CART_DRAWER_ID);
}

export function closeCartDrawer() {
  closeDialog(CART_DRAWER_ID);
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
    "DOMContentLoaded",
    () => {
      openCartActionRetryQueued = false;
      configureOpenCartAction();
    },
    { once: true },
  );
}

configureOpenCartAction();
