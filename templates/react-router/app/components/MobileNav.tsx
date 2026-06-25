import { Link } from "react-router";

import { closeMobileNavDrawer, MOBILE_NAV_DRAWER_ID, openDialogFallback } from "~/lib/cart-drawer";

export type NavCollection = {
  handle: string;
  title: string;
};

export function MobileNav({ collections }: { collections: NavCollection[] }) {
  return (
    <dialog
      id={MOBILE_NAV_DRAWER_ID}
      className="drawer-left bg-surface text-on-surface"
      aria-labelledby="mobile-nav-title"
      data-testid="mobile-nav"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="min-h-touch-target relative flex shrink-0 items-center px-4 py-1">
          <span
            className="text-on-surface pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-medium"
            id="mobile-nav-title"
            aria-live="polite"
          >
            Mobile navigation
          </span>
          <button
            type="button"
            commandfor={MOBILE_NAV_DRAWER_ID}
            command="close"
            className="button-icon focus-visible:outline-accent ms-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close"
            onClick={() => closeMobileNavDrawer()}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <nav aria-label="Mobile navigation">
            <ul role="list" className="flex flex-col">
              {collections.map((collection) => (
                <li key={collection.handle}>
                  <Link
                    to={`/collections/${collection.handle}`}
                    className="min-h-touch-target text-on-surface flex items-center rounded-sm text-xl font-normal no-underline hover:opacity-70 motion-safe:transition-opacity"
                    onClick={() => closeMobileNavDrawer()}
                  >
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </dialog>
  );
}

export function MobileNavTrigger() {
  return (
    <button
      type="button"
      commandfor={MOBILE_NAV_DRAWER_ID}
      command="show-modal"
      className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
      aria-label="Menu"
      aria-controls={MOBILE_NAV_DRAWER_ID}
      aria-haspopup="dialog"
      data-testid="nav-trigger"
      onClick={() => openDialogFallback(MOBILE_NAV_DRAWER_ID)}
    >
      <img src="/icons/icon-menu.svg" alt="" className="size-5" aria-hidden="true" />
    </button>
  );
}
