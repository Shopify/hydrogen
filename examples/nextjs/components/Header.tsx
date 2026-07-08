import Link from "next/link";
import type { ReactNode } from "react";

import { content } from "@/lib/content";

import { CartTrigger } from "./CartTrigger";
import { MobileNavDialog } from "./MobileNavDialog";
import { PredictiveSearchTrigger } from "./PredictiveSearchTrigger";

/** Maps a header nav item to its route. "Collections" -> the collections
 * index; the category items -> their collection PLP. */
const navItemHref: Record<(typeof content.header.navItems)[number], string> = {
  Collections: "/collections",
  Men: "/collections/men",
  Women: "/collections/women",
  Accessories: "/collections/accessories",
};

/**
 * Site header — server shell + small client islands (engineering.md F7;
 * `hydrogen-setup` / `references/navbar.md`). Server-rendered: logo `<Link>`,
 * desktop nav `<Link>`s, and a real `<Link href="/search">` search trigger
 * (server-rendered, F4 — reachable without JS). Client islands: `CartTrigger`
 * (`showModal()` button, cart count), `PredictiveSearchTrigger` (hydrates
 * the `/search` link into the modal trigger), `MobileNavDialog` (`<dialog>` with
 * an always-rendered fallback link list).
 *
 * The cart trigger opens the `<dialog>` drawer via `showModal()`
 * (hydrogen-cart-drawer) — NO `hasHydrated` anchor/button swap (feedback
 * Round 4 #3). The footer `/cart` link is the no-JS cart fallback.
 */
export function Header({ accountLink }: { accountLink?: ReactNode }) {
  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex items-center gap-2">
          <MobileNavDialog />
          <Link
            href="/"
            className="text-on-surface focus-visible:outline-accent inline-flex items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            CORE
          </Link>
        </div>

        <nav
          aria-label={content.header.navigation}
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 md:flex"
        >
          {content.header.navItems.map((item) => (
            <Link
              key={item}
              href={navItemHref[item]}
              className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-0">
          <PredictiveSearchTrigger />
          <noscript>
            <form action="/search" method="get" role="search" className="sr-only">
              <label htmlFor="header-search-q">{content.general.search}</label>
              <input id="header-search-q" name="q" type="search" />
              <button type="submit">{content.search.submit}</button>
            </form>
          </noscript>

          {accountLink}

          <CartTrigger />
        </div>
      </div>
    </header>
  );
}
