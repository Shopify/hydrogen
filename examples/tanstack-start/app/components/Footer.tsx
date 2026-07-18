import { Link } from "@tanstack/react-router";

import { content } from "~/lib/content";

const footerLinkClass =
  "min-h-touch-target text-on-surface-secondary hover:text-on-surface focus-visible:outline-accent inline-flex items-center font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

/**
 * Site footer — shared chrome, server-rendered. Includes the `/cart` link that
 * is the drawer's reachable no-JS fallback on every page (engineering.md F4 +
 * `notes/cart.md` "Without JavaScript").
 */
export function Footer() {
  return (
    <footer className="max-w-page px-margin mx-auto w-full">
      <div className="border-border grid grid-cols-1 gap-8 border-t py-12 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="type-body-sm text-on-surface mb-4 font-medium">CORE</h2>
          <p className="text-on-surface-secondary">&copy; 2026 CORE</p>
        </div>
        <nav aria-labelledby="footer-quick-links-heading">
          <h2
            className="type-body-sm text-on-surface mb-4 font-medium"
            id="footer-quick-links-heading"
          >
            {content.footer.quickLinks}
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            <li>
              <Link
                to="/collections"
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                Collections
              </Link>
            </li>
            <li>
              <Link
                to="/collections/$handle"
                params={{ handle: "men" }}
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                Men
              </Link>
            </li>
            <li>
              <Link
                to="/collections/$handle"
                params={{ handle: "women" }}
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                Women
              </Link>
            </li>
            <li>
              <Link
                to="/collections/$handle"
                params={{ handle: "accessories" }}
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                Accessories
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-customer-care-heading">
          <h2
            className="type-body-sm text-on-surface mb-4 font-medium"
            id="footer-customer-care-heading"
          >
            {content.footer.customerCare}
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            <li>
              <Link
                to="/search"
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                {content.footer.search}
              </Link>
            </li>
            <li>
              <Link
                to="/cart"
                activeOptions={{ exact: true, includeSearch: false }}
                className={footerLinkClass}
              >
                {content.cart.title}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="type-body-sm text-on-surface mb-4 font-medium">
            {content.footer.paymentMethods}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-border text-on-surface-secondary rounded-sm border px-2 py-1 text-xs">
              Visa
            </span>
            <span className="border-border text-on-surface-secondary rounded-sm border px-2 py-1 text-xs">
              Mastercard
            </span>
            <span className="border-border text-on-surface-secondary rounded-sm border px-2 py-1 text-xs">
              Shop Pay
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
