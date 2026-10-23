import { css, type Handle } from "remix/component";

import type { Layout } from "../lib/layout.ts";
import { toMenuLinks } from "../lib/public/menu.ts";

const footerStyle = css({ background: "var(--color-dark)", marginTop: "auto" });

const footerMenuStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gridGap: "1rem",
  justifyContent: "center",
  padding: "1rem",
  "& a": { color: "var(--color-light)", minWidth: "fit-content" },
  '& a[aria-current="page"]': { fontWeight: "bold" },
});

export function Footer(handle: Handle<{ layout: Layout }>) {
  return () => {
    const { layout } = handle.props;
    const links = toMenuLinks(layout.footerMenu?.items ?? FALLBACK_FOOTER_MENU, {
      pathPrefix: layout.locale.pathPrefix,
      shopDomains: [layout.publicStoreDomain, layout.header.shop.primaryDomain.url],
    });

    return (
      <footer mix={footerStyle}>
        <nav mix={footerMenuStyle} role="navigation">
          {links.map((link) =>
            link.external ? (
              <a key={link.id} href={link.url} rel="noopener noreferrer" target="_blank">
                {link.title}
              </a>
            ) : (
              <a key={link.id} href={link.url} data-rmx-prefetch="intent">
                {link.title}
              </a>
            ),
          )}
        </nav>
      </footer>
    );
  };
}

const FALLBACK_FOOTER_MENU = [
  {
    id: "gid://shopify/MenuItem/461633060920",
    title: "Privacy Policy",
    url: "/policies/privacy-policy",
  },
  {
    id: "gid://shopify/MenuItem/461633093688",
    title: "Refund Policy",
    url: "/policies/refund-policy",
  },
  {
    id: "gid://shopify/MenuItem/461633126456",
    title: "Shipping Policy",
    url: "/policies/shipping-policy",
  },
  {
    id: "gid://shopify/MenuItem/461633159224",
    title: "Terms of Service",
    url: "/policies/terms-of-service",
  },
];
