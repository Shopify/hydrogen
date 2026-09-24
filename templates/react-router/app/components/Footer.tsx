import { Link } from "react-router";

import type { StorefrontShop } from "~/lib/storefront-shop";

import { PaymentMethodIcon } from "./PaymentMethodIcon";

const linkClass =
  "min-h-touch-target text-on-surface-secondary hover:text-on-surface focus-visible:outline-accent inline-flex items-center font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

export function Footer({ shopInfo }: { shopInfo: StorefrontShop }) {
  return (
    <footer className="max-w-page px-margin mx-auto w-full">
      <div
        className={`border-border grid grid-cols-1 gap-8 border-t py-12 text-sm md:grid-cols-2 ${shopInfo.paymentMethods.length > 0 ? "lg:grid-cols-3" : ""}`}
      >
        <div className="min-w-0 wrap-anywhere">
          <h2 className="type-body-sm text-on-surface mb-4 font-medium">{shopInfo.name}</h2>
        </div>
        <nav aria-labelledby="footer-customer-care-heading">
          <h2
            className="type-body-sm text-on-surface mb-4 font-medium"
            id="footer-customer-care-heading"
          >
            Customer care
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            <li>
              <Link to="/search" className={linkClass}>
                Search
              </Link>
            </li>
          </ul>
        </nav>
        {shopInfo.paymentMethods.length > 0 ? (
          <div>
            <h2
              id="footer-payment-methods-heading"
              className="type-body-sm text-on-surface mb-4 font-medium"
            >
              Payment methods
            </h2>
            <ul
              role="list"
              aria-labelledby="footer-payment-methods-heading"
              className="flex flex-wrap items-center gap-2"
            >
              {shopInfo.paymentMethods.map((method) => (
                <li key={method} className="max-w-full">
                  <PaymentMethodIcon method={method} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
