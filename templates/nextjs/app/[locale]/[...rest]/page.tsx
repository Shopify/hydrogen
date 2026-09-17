import { notFound } from "next/navigation";

/**
 * The root layout lives in the `[locale]` segment, so Next has no static layout
 * to compose a global `app/not-found.tsx` from (and `dynamicParams = false` is
 * not allowed under `cacheComponents`). `proxy.ts` rewrites every page URL into
 * this segment; anything that reaches here matched no route, so hand it to the
 * locale's `not-found.tsx`, which renders the localized 404 inside the shell and
 * runs Shopify URL redirects.
 *
 * Trade-off: this `notFound()` fires inside a partially prerendered shell, so
 * the response is `200` with `<meta name="robots" content="noindex">` rather
 * than a `404` status. Missing products and collections already behave this way
 * under Cache Components; this makes unmatched URLs consistent with them.
 */
export default function CatchAll(): never {
  notFound();
}
