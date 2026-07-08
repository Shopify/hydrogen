import { data, Link } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { canonicalUrl } from "~/lib/site";

import type { Route } from "./+types/catchall";

export const meta: MetaFunction = () => {
  return [
    { title: "Page not found — CORE" },
    { tagName: "link", rel: "canonical", href: canonicalUrl("/404") },
  ];
};

/**
 * Catch-all route — renders the framework 404 for unmatched URLs. The loader
 * returns a 404 status so the root middleware's post-`next()`
 * `handleShopifyRedirects` check (`response.status === 404`) fires and Shopify
 * URL redirects are honored before this page renders. `data(null, {status: 404})`
 * sets the status without throwing, so this component still renders.
 */
export function loader(_args: LoaderFunctionArgs) {
  return data(null, { status: 404 });
}

export default function Catchall(_: Route.ComponentProps) {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-16 text-center">
      <h1 className="type-display mb-4">Page not found</h1>
      <p className="type-body text-on-surface-secondary mb-8">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        to="/"
        className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
      >
        Back to home
      </Link>
    </div>
  );
}
