import { content } from "@/lib/content";

import { LocalizedLink } from "./LocalizedLink";

const footerLinkClass =
  "min-h-touch-target text-on-surface-secondary hover:text-on-surface focus-visible:outline-accent inline-flex items-center font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

/**
 * Site footer — shared chrome, server-rendered. Includes the `/cart` link that
 * keeps the cart route reachable when the drawer is unavailable.
 */
export function Footer({ shopName = "CORE" }: { shopName?: string }) {
  return (
    <footer className="max-w-page px-margin mx-auto w-full">
      <div className="border-border grid grid-cols-1 gap-8 border-t py-12 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="type-body-sm text-on-surface mb-4 font-medium">{shopName}</h2>
          <p className="text-on-surface-secondary">
            &copy; {new Date().getFullYear()} {shopName}
          </p>
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
              <LocalizedLink href="/collections" className={footerLinkClass}>
                Collections
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/collections/men" className={footerLinkClass}>
                Men
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/collections/women" className={footerLinkClass}>
                Women
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/collections/accessories" className={footerLinkClass}>
                Accessories
              </LocalizedLink>
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
              <LocalizedLink href="/search" className={footerLinkClass}>
                {content.footer.search}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/cart" className={footerLinkClass}>
                {content.cart.title}
              </LocalizedLink>
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
