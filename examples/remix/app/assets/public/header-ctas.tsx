import type { CartState } from "@shopify/hydrogen";
import { clientEntry, on, type Handle } from "remix/component";

import type { CartInitialData } from "../../lib/cart.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { openAside } from "../../ui/public/aside.tsx";
import { publishCartViewed } from "./analytics.ts";
import { getCartStore } from "./cart-store.ts";

/**
 * Header actions. Every control is a real link first (`/account`, `/search`, `/cart`), so
 * the header works before hydration; once hydrated, search and cart open their asides.
 */
export const HeaderCtas = clientEntry(
  import.meta.url,
  function HeaderCtas(
    handle: Handle<{
      accountPath: string;
      initialCart: CartInitialData;
      isLoggedIn: boolean;
      loginPath: string;
      pathPrefix: string;
    }>,
  ) {
    const store = getCartStore(handle.props.initialCart, handle.props.pathPrefix);
    let state: CartState | undefined = store?.getState();

    if (store) {
      const unsubscribe = store.subscribe((next) => {
        state = next;
        handle.update();
      });
      handle.signal.addEventListener("abort", unsubscribe, { once: true });
    }

    return () => {
      const { accountPath, initialCart, isLoggedIn, loginPath, pathPrefix } = handle.props;
      const quantity =
        state && !state.loading ? state.data.totalQuantity : (initialCart.cart?.totalQuantity ?? 0);

      return (
        <nav class="header-ctas" role="navigation">
          <a
            href={localizePath("/", pathPrefix)}
            class="header-menu-mobile-toggle reset"
            aria-label="Open menu"
            mix={on("click", (event) => {
              event.preventDefault();
              openAside("mobile");
            })}
          >
            <h3>☰</h3>
          </a>
          {isLoggedIn ? (
            <a href={accountPath}>Account</a>
          ) : (
            // Customer Account routes redirect to Shopify, so they need document navigation.
            <a href={loginPath} data-rmx-document>
              Sign in
            </a>
          )}
          <a
            href={localizePath("/search", pathPrefix)}
            mix={on("click", (event) => {
              event.preventDefault();
              openAside("search");
            })}
          >
            Search
          </a>
          <a
            href={localizePath("/cart", pathPrefix)}
            mix={on("click", (event) => {
              event.preventDefault();
              openAside("cart");
              if (store) publishCartViewed(store);
            })}
          >
            Cart <span aria-label={`(items: ${quantity})`}>{quantity}</span>
          </a>
        </nav>
      );
    };
  },
);
