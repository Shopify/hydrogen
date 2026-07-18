import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { canonicalUrl } from "~/lib/site";

/**
 * Catch-all route — renders the framework 404 for unmatched URLs. The loader
 * throws TanStack Router's not-found signal so the server response carries a
 * 404 status and the root middleware's post-`next()`
 * `handleShopifyRedirects` check (`response.status === 404`) fires and Shopify
 * URL redirects are honored before this page renders.
 */
export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound();
  },
  head: () => ({
    meta: [{ title: "Page not found — CORE" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: canonicalUrl("/404") }],
  }),
  notFoundComponent: Catchall,
});

function Catchall() {
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
