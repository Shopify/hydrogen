import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
import { A, createAsync, query, useLocation } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";

import { useCart } from "../lib/cart";
import { CART_DRAWER_ID, openCartDrawer, supportsDialogCommands } from "../lib/cart-drawer";
import { getRequestStorefrontClient } from "../lib/request-storefront";

const fetchHeaderCollections = query(async () => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(HEADER_COLLECTIONS_QUERY);
  return normalizeHeaderCollections(data?.collections?.nodes);
}, "header-collections");

export function Header() {
  const collections = createAsync(() => fetchHeaderCollections());
  const totalQuantity = useCart((s) => s.data.totalQuantity);
  const location = useLocation();
  const [hasHydrated, setHasHydrated] = createSignal(false);
  const rendersCartPage = () => location.pathname === "/cart";
  const cartLabel = () =>
    totalQuantity() === 0
      ? "Cart, empty"
      : `Cart, ${totalQuantity() > 99 ? "99 or more" : totalQuantity()} ${
          totalQuantity() === 1 ? "item" : "items"
        }`;

  onMount(() => setHasHydrated(true));

  return (
    <header class="border-b border-black/10">
      <div class="mx-auto grid h-16 max-w-[1480px] grid-cols-3 items-center px-6">
        <nav class="flex items-center gap-6 text-sm font-semibold">
          <For each={collections() ?? []}>
            {(collection) => (
              <A href={`/collections/${collection.handle}`} class="hover:opacity-60">
                {collection.title}
              </A>
            )}
          </For>
          <A href="/collections" class="hover:opacity-60">
            Collections
          </A>
          <A href="/blogs/news" class="hover:opacity-60">
            News
          </A>
        </nav>
        <A href="/" class="justify-self-center text-lg font-black tracking-tight">
          MOCK.SHOP
        </A>
        <div class="flex items-center justify-end gap-5">
          <button aria-label="Search" class="hover:opacity-60">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          <A href="/" aria-label="Account" class="hover:opacity-60">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </A>
          <Show
            when={hasHydrated() && !rendersCartPage()}
            fallback={
              <A
                href="/cart"
                aria-label={cartLabel()}
                aria-current={rendersCartPage() ? "page" : undefined}
                class="relative grid h-10 w-10 place-items-center hover:opacity-60"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
                  <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                </svg>
                <Show when={totalQuantity() > 0}>
                  <span class="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white">
                    {totalQuantity() > 99 ? "99+" : totalQuantity()}
                  </span>
                </Show>
              </A>
            }
          >
            <button
              type="button"
              aria-label={cartLabel()}
              aria-controls={CART_DRAWER_ID}
              aria-haspopup="dialog"
              command="show-modal"
              commandfor={CART_DRAWER_ID}
              class="relative grid h-10 w-10 place-items-center hover:opacity-60"
              onClick={() => !supportsDialogCommands() && openCartDrawer()}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              <Show when={totalQuantity() > 0}>
                <span class="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white">
                  {totalQuantity() > 99 ? "99+" : totalQuantity()}
                </span>
              </Show>
            </button>
          </Show>
        </div>
      </div>
    </header>
  );
}
