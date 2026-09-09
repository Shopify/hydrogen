import { createFileRoute } from "@tanstack/react-router";

import { resolveNotFound } from "~/server/not-found";

// Catch-all: no framework route matched. Ask the server whether Shopify has a
// redirect for this URL; otherwise it throws `notFound()` and the root route's
// `notFoundComponent` renders. Runs identically on hard loads and client-side
// navigations because the lookup is a server function, not middleware.
export const Route = createFileRoute("/$")({
  loader: ({ location }) =>
    resolveNotFound({ data: { pathname: location.pathname, search: location.searchStr } }),
});
