import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { shopifyRequestMiddleware } from "./server/shopify-middleware";

// Defining `start.ts` disables Start's automatic CSRF middleware, so it is
// re-added explicitly. Scoped to server functions: Hydrogen's own handlers
// (`/api/cart` form POSTs, `/account/logout`) are served before routing by
// `shopifyRequestMiddleware` and are not same-origin-RPC endpoints.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, shopifyRequestMiddleware],
}));
