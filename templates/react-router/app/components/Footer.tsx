import { Link } from "react-router";

import { content } from "~/lib/content";

const footerLinkClass =
  "min-h-touch-target text-on-surface-secondary hover:text-on-surface focus-visible:outline-accent inline-flex items-center font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

export function Footer({
  shopName,
  collections,
}: {
  shopName: string;
  collections: ReadonlyArray<{ handle: string; title: string }>;
}) {
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
              <Link to="/collections" className={footerLinkClass}>
                {content.header.collections}
              </Link>
            </li>
            {collections.map((collection) => (
              <li key={collection.handle}>
                <Link to={`/collections/${collection.handle}`} className={footerLinkClass}>
                  {collection.title}
                </Link>
              </li>
            ))}
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
              <Link to="/search" className={footerLinkClass}>
                {content.footer.search}
              </Link>
            </li>
            <li>
              <Link to="/cart" className={footerLinkClass}>
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
