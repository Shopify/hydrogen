import { clientEntry, on, type Handle } from "remix/component";

import { localizePath } from "../../lib/public/i18n.ts";
import type { MenuLink } from "../../lib/public/menu.ts";
import { routes } from "../../routes.ts";
import { AsideDialog, closeAsides } from "../../ui/public/aside.tsx";

export const MobileMenuAside = clientEntry(
  import.meta.url,
  function MobileMenuAside(handle: Handle<{ links: MenuLink[]; pathPrefix: string }>) {
    return () => (
      <AsideDialog type="mobile" heading="MENU">
        <nav class="header-menu-mobile" role="navigation">
          <a
            href={localizePath(routes.home.href(), handle.props.pathPrefix)}
            mix={on("click", closeAsides)}
          >
            Home
          </a>
          {handle.props.links.map((link) => (
            <a
              key={link.id}
              class="header-menu-item"
              href={link.url}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              mix={on("click", closeAsides)}
            >
              {link.title}
            </a>
          ))}
        </nav>
      </AsideDialog>
    );
  },
);
