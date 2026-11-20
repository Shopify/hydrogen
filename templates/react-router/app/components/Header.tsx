import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useCart } from "~/lib/cart";
import { CART_DRAWER_ID, SEARCH_DRAWER_ID, openDialogFromLinkClick } from "~/lib/cart-drawer";
import { type LocaleOption, useLocalizePath } from "~/lib/locale";
import { i18n } from "~/lib/shop";
import type { StorefrontShop } from "~/lib/storefront-shop";

import { LocalePicker } from "./LocalePicker";
import { MobileNav, MobileNavTrigger } from "./MobileNav";

function cartCountLabel(count: number) {
  return count === 1 ? "Cart (1 item)" : `Cart (${count} items)`;
}

function liveCartCountLabel(count: number) {
  return count === 1 ? "1 item in cart" : `${count} items in cart`;
}

function displayCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

// Outside /cart the count fills in after the first browser load, so the live region stays silent
// until the shopper changes the count, instead of announcing the loaded count on every page. A
// change made during the load counts: the first loaded count already includes it.
function useCartCountAnnouncement(totalQuantity: number, loading: boolean): string {
  const mountedQuantity = useRef(totalQuantity);
  const loadedQuantity = useRef<number | null>(null);
  const changedDuringLoad = useRef(false);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (loading) {
      if (totalQuantity !== mountedQuantity.current) changedDuringLoad.current = true;
      return;
    }
    if (loadedQuantity.current === null) {
      loadedQuantity.current = totalQuantity;
      if (changedDuringLoad.current) setChanged(true);
    } else if (totalQuantity !== loadedQuantity.current) {
      setChanged(true);
    }
  }, [loading, totalQuantity]);
  return changed ? liveCartCountLabel(totalQuantity) : "";
}

export function Header({
  shopInfo,
  localeOptions,
}: {
  shopInfo: StorefrontShop;
  localeOptions: readonly LocaleOption[];
}) {
  const localizePath = useLocalizePath();
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  // During the first load the count covers only changes made so far, so show none.
  const loading = useCart((state) => state.loading);
  const cartCountAnnouncement = useCartCountAnnouncement(totalQuantity, loading);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const logo = shopInfo.logo;

  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pe-3 md:max-w-48 md:flex-none md:pe-0">
          <div className="-ms-2 hidden shrink-0 max-md:block" data-hamburger-wrapper>
            <MobileNavTrigger />
          </div>
          <Link
            to={localizePath("/")}
            aria-label={shopInfo.name}
            title={shopInfo.name}
            className="text-on-surface focus-visible:outline-accent inline-flex max-w-48 min-w-0 items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {logo && failedLogoUrl !== logo.url ? (
              <img
                src={logo.url}
                alt={logo.altText ?? shopInfo.name}
                width={logo.width ?? undefined}
                height={logo.height ?? undefined}
                className="h-auto max-h-10 w-auto max-w-full object-contain"
                // An SSR image can fail before hydration attaches onError, so also check on mount.
                ref={(img) => {
                  if (img?.complete && img.naturalWidth === 0) setFailedLogoUrl(logo.url);
                }}
                onError={() => setFailedLogoUrl(logo.url)}
              />
            ) : (
              <span className="line-clamp-2 leading-tight wrap-anywhere">{shopInfo.name}</span>
            )}
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 overflow-x-auto md:flex"
          data-desktop-nav
        >
          <Link
            to={localizePath("/collections")}
            className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
          >
            Collections
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-0">
          <LocalePicker i18n={i18n} options={localeOptions} />
          <Link
            to={localizePath("/search")}
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Search"
            aria-controls={SEARCH_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="search-trigger"
            onClick={(event) => openDialogFromLinkClick(event, SEARCH_DRAWER_ID)}
          >
            <img src="/icons/icon-search.svg" alt="" className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to={localizePath("/account")}
            className="text-on-surface focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            aria-label="Account"
          >
            <img src="/icons/icon-user.svg" alt="" className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to={localizePath("/cart")}
            className="text-on-surface focus-visible:outline-accent relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97]"
            aria-label={loading ? "Cart" : cartCountLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={(event) => openDialogFromLinkClick(event, CART_DRAWER_ID)}
          >
            <span
              className="relative inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <img src="/icons/icon-cart.svg" alt="" className="size-5" />
              {!loading && totalQuantity > 0 ? (
                <span className="bg-interactive text-interactive-text absolute end-0 top-0 flex h-5 min-w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-medium">
                  {displayCount(totalQuantity)}
                </span>
              ) : null}
            </span>
          </Link>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {cartCountAnnouncement}
          </span>
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
