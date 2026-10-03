import { describe, it } from "vitest";

import { createStorefrontClient } from "../../client/client";
import {
  createCustomerAccountServerHandlers,
  createCustomerSession,
} from "../../customer-account";
import { handleShopifyRoutes as handleShopifyRoutesDev } from "../development";
import {
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createShopifyRequestContext,
  createShopifyRouteHandler,
  handleShopifyRoutes,
  type CartServerHandlers,
  type ShopifyRouteHandlerContext,
  type ShopifyRouteHandlerGroup,
} from "../index";

// No route matches this URL, so the calls below return null when run.
const request = new Request("https://example.com/no-route");
const storefrontClient = createStorefrontClient({
  type: "public",
  requestContext: createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  }),
  config: { storeDomain: "test-store.myshopify.com", publicStorefrontToken: "test-token" },
});
const options = { request, requestContext: storefrontClient.requestContext, storefrontClient };
const sessionManager = {
  getSessionOrigin: () => "https://example.com",
  getSessionItem: (_key: string) => undefined,
  setSessionItem: (_key: string, _value: unknown) => {},
  removeSessionItem: (_key: string) => {},
};
const customerSession = createCustomerSession({
  shopId: "123456789",
  customerAccountApiClientId: "shp_test-client-id",
});

describe("handleShopifyRoutes sessionManager requirement", () => {
  it("is optional when no registered handler reads the session", () => {
    const customHandler = createShopifyRouteHandler(
      "/api/hello",
      "GET",
      async ({ storefrontClient: _client }: Omit<ShopifyRouteHandlerContext, "sessionManager">) => ({
        type: "json" as const,
        data: {},
      }),
    );
    const registerOptional = (handlers?: readonly CartServerHandlers[]) =>
      handleShopifyRoutes({ ...options, handlers });

    handleShopifyRoutes(options);
    handleShopifyRoutes({
      ...options,
      handlers: [
        createCartServerHandlers(),
        createPredictiveSearchServerHandlers(),
        { get: customHandler },
      ],
    });
    handleShopifyRoutes({ ...options, handlers: undefined });
    handleShopifyRoutesDev({ ...options, handlers: undefined });
    registerOptional();
  });

  it("is required when a registered handler reads the session", () => {
    const accountHandlers = createCustomerAccountServerHandlers({ customerSession });
    const cartHandlersWithSession = createCartServerHandlers({ customerSession });
    const customHandler = createShopifyRouteHandler("/api/hello", "GET", async (context) => ({
      type: "json" as const,
      data: { origin: await context.sessionManager.getSessionOrigin() },
    }));
    const optionalSessionHandler = createShopifyRouteHandler(
      "/api/optional",
      "GET",
      async ({ sessionManager: manager }: Partial<ShopifyRouteHandlerContext>) => ({
        type: "json" as const,
        data: { origin: await manager?.getSessionOrigin() },
      }),
    );
    const untypedGroups: ShopifyRouteHandlerGroup[] = [];
    const registerOptionalAccount = (handlers?: readonly (typeof accountHandlers)[]) =>
      // @ts-expect-error possibly-undefined session-aware handlers still require it
      handleShopifyRoutes({ ...options, handlers });

    // @ts-expect-error Customer Account handlers read the session
    handleShopifyRoutes({ ...options, handlers: [accountHandlers] });
    // @ts-expect-error cart handlers created with customerSession read the session
    handleShopifyRoutes({ ...options, handlers: [cartHandlersWithSession] });
    // @ts-expect-error one session-aware group is enough to require it
    handleShopifyRoutes({ ...options, handlers: [createCartServerHandlers(), accountHandlers] });
    // @ts-expect-error unannotated custom handlers receive the full context
    handleShopifyRoutes({ ...options, handlers: [{ customHandler }] });
    // @ts-expect-error numeric keys are registered like any other key
    handleShopifyRoutes({ ...options, handlers: [{ 0: customHandler }] });
    // @ts-expect-error an optional sessionManager in the context still requires one
    handleShopifyRoutes({ ...options, handlers: [{ get: optionalSessionHandler }] });
    // @ts-expect-error handlers whose types are not known may read the session
    handleShopifyRoutes({ ...options, handlers: untypedGroups });
    // @ts-expect-error the development entry has the same requirement
    handleShopifyRoutesDev({ ...options, handlers: [accountHandlers] });
    registerOptionalAccount();

    handleShopifyRoutes({
      ...options,
      sessionManager,
      handlers: [createCartServerHandlers(), cartHandlersWithSession, accountHandlers],
    });
  });
});
