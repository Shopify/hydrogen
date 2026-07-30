import { data } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { NotFound } from "~/components/NotFound";
import { shopNameFromMatches, shopTitle } from "~/lib/meta";
import { canonicalUrl } from "~/lib/site";

import type { Route } from "./+types/catchall";

export const meta: MetaFunction = ({ matches }) => {
  return [
    { title: shopTitle("Page not found", shopNameFromMatches(matches)) },
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
  return <NotFound />;
}
