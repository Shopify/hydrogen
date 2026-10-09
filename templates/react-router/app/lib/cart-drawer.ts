export const CART_DRAWER_ID = "cart-drawer";
export const MOBILE_NAV_DRAWER_ID = "mobile-nav-drawer";
export const SEARCH_DRAWER_ID = "search-drawer";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

function getDialog(id: string): HTMLDialogElement | null {
  if (typeof document === "undefined" || typeof HTMLDialogElement === "undefined") return null;
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

export function closeSearchDrawer(): void {
  closeDialog(SEARCH_DRAWER_ID);
}

export function openDialogFallback(id: string): void {
  if (supportsDialogCommands()) return;
  openDialog(id);
}

type LinkClick = Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"> & {
  preventDefault(): void;
};

// Only a plain left click on an existing dialog is intercepted, so the href
// still works without JavaScript and for open-in-new-tab clicks.
export function openDialogFromLinkClick(event: LinkClick, id: string): void {
  const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  if (event.button !== 0 || isModifiedClick) return;
  if (!getDialog(id)) return;
  event.preventDefault();
  openDialog(id);
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
