import type { Handle } from "remix/component";

import { HeaderCtas } from "../assets/public/header-ctas.tsx";
import type { Layout } from "../lib/layout.ts";
import { localizePath } from "../lib/public/i18n.ts";
import { toMenuLinks, type MenuLink } from "../lib/public/menu.ts";
import { routes } from "../routes.ts";

export function Header(handle: Handle<{ layout: Layout; pathname: string }>) {
  return () => {
    const { layout, pathname } = handle.props;
    const { pathPrefix } = layout.locale;
    const accountPath = localizePath(routes.account.index.href(), pathPrefix);

    return (
      <header class="header">
        <a
          href={localizePath(routes.home.href(), pathPrefix)}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <strong>{layout.header.shop.name}</strong>
        </a>
        <nav class="header-menu-desktop" role="navigation">
          {headerMenuLinks(layout, pathPrefix).map((link) => (
            <a
              key={link.id}
              class="header-menu-item"
              href={link.url}
              aria-current={isCurrent(link, pathname, pathPrefix) ? "page" : undefined}
            >
              {link.title}
            </a>
          ))}
        </nav>
        <HeaderCtas
          accountPath={accountPath}
          initialCart={layout.cart}
          isLoggedIn={layout.isLoggedIn}
          loginPath={`${localizePath("/account/login", pathPrefix)}?return_to=${encodeURIComponent(accountPath)}`}
          pathPrefix={pathPrefix}
        />
      </header>
    );
  };
}

export function headerMenuLinks(layout: Layout, pathPrefix: string): MenuLink[] {
  return toMenuLinks(layout.header.menu?.items ?? FALLBACK_HEADER_MENU, {
    pathPrefix,
    shopDomains: [layout.publicStoreDomain, layout.header.shop.primaryDomain.url],
  });
}

function isCurrent(link: MenuLink, pathname: string, pathPrefix: string) {
  return !link.external && localizePath(pathname, pathPrefix) === link.url;
}

const FALLBACK_HEADER_MENU = [
  { id: "gid://shopify/MenuItem/461609500728", title: "Collections", url: "/collections" },
  { id: "gid://shopify/MenuItem/461609533496", title: "Blog", url: "/blogs/journal" },
  { id: "gid://shopify/MenuItem/461609566264", title: "Policies", url: "/policies" },
  { id: "gid://shopify/MenuItem/461609599032", title: "About", url: "/pages/about" },
];
