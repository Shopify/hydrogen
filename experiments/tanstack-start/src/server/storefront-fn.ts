import { createServerFn } from "@tanstack/react-start";

import { shopifyRequestMiddleware } from "./shopify-middleware";

/**
 * Base builder for every storefront data server function.
 *
 * Declaring `shopifyRequestMiddleware` as a dependency types the handler's
 * `context` (storefront client, request context, customer session, Customer
 * Account client) straight from the middleware — no global registry lookup or
 * runtime presence check. Because the same middleware already ran globally
 * (see `start.ts`), Start dedupes it here and hands the fn the context that
 * global run produced instead of executing it twice.
 */
export const storefrontFn = createServerFn({ method: "GET" }).middleware([
  shopifyRequestMiddleware,
]);

export type ShopifyServerContext = (typeof shopifyRequestMiddleware)["~types"]["serverContext"];

type GraphqlResult<TData> = {
  data?: TData | null;
  errors?: ReadonlyArray<{ message: string }> | null;
};

/**
 * Storefront API errors (throttling, access denied, malformed queries) arrive
 * as HTTP 200 with `errors` and `data: null`. Treating that as "not found"
 * would turn an API incident into 404s plus extra redirect lookups, so surface
 * it as an error; callers only see `data` when the query actually succeeded.
 */
export function requireData<TData>(result: GraphqlResult<TData>, label: string): TData {
  if (result.errors?.length) {
    throw new Error(`Storefront API error in ${label}: ${result.errors[0].message}`);
  }
  if (result.data == null) throw new Error(`Storefront API returned no data for ${label}.`);
  return result.data;
}
