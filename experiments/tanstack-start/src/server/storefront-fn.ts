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
