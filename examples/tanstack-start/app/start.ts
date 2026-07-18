import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { storefrontMiddleware } from "~/lib/storefront-middleware";

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ handlerType }) => handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [storefrontMiddleware, csrfMiddleware],
}));
