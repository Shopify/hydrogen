import Link from "next/link";

const quickLinks = ["New arrivals", "Essentials", "Objects"];
const paymentMethods = ["Visa", "Mastercard", "Shop Pay"];

const footerLinkClass =
  "min-h-touch-target text-on-surface-secondary hover:text-on-surface focus-visible:outline-accent inline-flex items-center font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

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
            Quick links
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            {quickLinks.map((link) => (
              <li key={link}>
                <a href="#" className={footerLinkClass}>
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-customer-care-heading">
          <h2
            className="type-body-sm text-on-surface mb-4 font-medium"
            id="footer-customer-care-heading"
          >
            Customer care
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            <li>
              <Link href="/search" className={footerLinkClass}>
                Search
              </Link>
            </li>
            <li>
              <a href="#" className={footerLinkClass}>
                Account
              </a>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="type-body-sm text-on-surface mb-4 font-medium">Payment methods</h2>
          <div className="flex flex-wrap items-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="border-border text-on-surface-secondary rounded-sm border px-2 py-1 text-xs"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
