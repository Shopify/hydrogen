import type { ReactNode } from "react";

import { content } from "@/lib/content";
import { type Locale, localizedHref } from "@/lib/locale";

import { CartTrigger } from "./CartTrigger";
import { LocalizedLink } from "./LocalizedLink";
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
 * Site header: server shell + small client islands. Server-rendered: logo
 * link, desktop nav links, and a real `/search` link as the search trigger
 * that is reachable without JS. Links go through `LocalizedLink`; the
 * `<noscript>` form action is localized directly since it is a raw element. Client islands: `CartTrigger`,
 * `PredictiveSearchTrigger`, and `MobileNavDialog`.
 *
 * The cart trigger opens the `<dialog>` drawer via `showModal()`. The footer
 * `/cart` link is the full-page fallback when the drawer is unavailable.
 */
export function Header({
  accountLink,
  locale,
  shopName = "CORE",
}: {
  accountLink?: ReactNode;
  locale: Locale;
  shopName?: string;
}) {
  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex items-center gap-2">
          <MobileNavDialog />
          <LocalizedLink
            href="/"
            className="text-on-surface focus-visible:outline-accent inline-flex items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {shopName}
          </LocalizedLink>
        </div>

        <nav
          aria-label={content.header.navigation}
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 md:flex"
        >
          {content.header.navItems.map((item) => (
            <LocalizedLink
              key={item}
              href={navItemHref[item]}
              className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            >
              {item}
            </LocalizedLink>
          ))}
        </nav>

        <div className="flex items-center gap-0">
          <PredictiveSearchTrigger />
          <noscript>
            <form
              action={localizedHref("/search", locale)}
              method="get"
              role="search"
              className="sr-only"
            >
              <label htmlFor="header-search-q">{content.general.search}</label>
              <input id="header-search-q" name="q" type="search" autoComplete="off" />
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
