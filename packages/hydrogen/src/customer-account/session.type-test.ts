import { describe, expectTypeOf, it } from "vitest";

import { createCartServerHandlers } from "../core/cart/server-handlers";
import { createShopifyRequestContext } from "../core/request-context";
import type { ShopifyRouteHandlerGroup } from "../core/request-routing/registered-routes";
import {
  createCustomerAccountServerHandlers,
  createCustomerSession,
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
  type Awaitable,
  type CreateCustomerAccountServerHandlersOptions,
  type CustomerAccountServerHandlers,
  type CustomerAccountServerHandlersWithCartSync,
  type CustomerSession,
  type ReadonlyCustomerSessionManager,
  type WritableCustomerSessionManager,
} from "./index";

const customerSession = createCustomerSession({
  shopId: "123456789",
  customerAccountApiClientId: "shp_test-client-id",
});
const cartServerHandlers = createCartServerHandlers({ customerSession });

const readonlySessionManager: ReadonlyCustomerSessionManager = {
  getSessionItem(_key: string) {
    return undefined;
  },
};

const writableSessionManager: WritableCustomerSessionManager = {
  ...readonlySessionManager,
  getSessionOrigin() {
    return "https://example.com";
  },
  setSessionItem(_key: string, _value: unknown) {},
  removeSessionItem(_key: string) {},
  commit() {
    return new Headers();
  },
};
const requestContext = createShopifyRequestContext({
  request: new Request("https://example.com"),
  i18n: { country: "US", language: "EN" },
});

describe("Customer Account session type boundary", () => {
  it("exports route constants as literals", () => {
    expectTypeOf(CUSTOMER_ACCOUNT_AUTHORIZE_PATH).toEqualTypeOf<"/account/authorize">();
    expectTypeOf(CUSTOMER_ACCOUNT_LOGIN_PATH).toEqualTypeOf<"/account/login">();
    expectTypeOf(CUSTOMER_ACCOUNT_LOGOUT_PATH).toEqualTypeOf<"/account/logout">();
    expectTypeOf(CUSTOMER_ACCOUNT_REFRESH_PATH).toEqualTypeOf<"/account/refresh">();
  });

  it("allows read-only managers for read-only session checks", () => {
    expectTypeOf(customerSession.isLoggedIn(readonlySessionManager, requestContext)).toEqualTypeOf<
      Promise<boolean>
    >();
    expectTypeOf(
      customerSession.getAccessToken(readonlySessionManager, requestContext),
    ).toEqualTypeOf<
      Promise<string | undefined>
    >();
  });

  it("requires writable managers for mutating session methods", () => {
    const call = () => {
      customerSession.getOrRefreshAccessToken(writableSessionManager, requestContext);
      customerSession.prepareLoginUrl(writableSessionManager, requestContext, {
        returnTo: "/account",
      });
      customerSession.handleOAuthCallback(
        writableSessionManager,
        requestContext,
        new Request("https://example.com/account/authorize"),
      );
      customerSession.logout(writableSessionManager, requestContext);

      // @ts-expect-error refresh can write new tokens and requires a writable manager
      customerSession.getOrRefreshAccessToken(readonlySessionManager, requestContext, { origin: "https://example.com" });
      // @ts-expect-error login writes pending OAuth state and requires a writable manager
      customerSession.prepareLoginUrl(readonlySessionManager, requestContext, { origin: "https://example.com" });
      customerSession.handleOAuthCallback(
        // @ts-expect-error callback writes tokens and requires a writable manager
        readonlySessionManager,
        requestContext,
        new Request("https://example.com/account/authorize"),
      );
      // @ts-expect-error logout clears tokens and requires a writable manager
      customerSession.logout(readonlySessionManager, requestContext, { origin: "https://example.com" });
    };

    expectTypeOf(call).toBeFunction();
  });

  it("keeps Awaitable as a narrow Promise-or-value helper", () => {
    expectTypeOf<Awaitable<string>>().toEqualTypeOf<string | Promise<string>>();
  });

  it("returns handlers compatible with handleShopifyRoutes", () => {
    const handlers = createCustomerAccountServerHandlers({ customerSession });
    const handlersWithCartSync = createCustomerAccountServerHandlers({
      customerSession,
      cartServerHandlers,
    });
    const options: CreateCustomerAccountServerHandlersOptions = {
      customerSession,
      cartServerHandlers,
    };
    const handlersFromAnnotatedOptions = createCustomerAccountServerHandlers(options);
    const unbrandedSession: CustomerSession = customerSession;
    const rejectedCalls = () => {
      // @ts-expect-error cart buyer identity sync requires a session created by createCustomerSession
      createCustomerAccountServerHandlers({
        customerSession: unbrandedSession,
        cartServerHandlers,
      });
      // @ts-expect-error cart handlers without customerSession cannot synchronize buyer identity
      createCustomerAccountServerHandlers({ customerSession, cartServerHandlers: createCartServerHandlers() });
    };
    expectTypeOf(rejectedCalls).toBeFunction();
    const unbrandedHandlers = createCustomerAccountServerHandlers({
      customerSession: unbrandedSession,
    });

    expectTypeOf(handlers).toMatchTypeOf<CustomerAccountServerHandlers>();
    expectTypeOf(handlers).toMatchTypeOf<ShopifyRouteHandlerGroup>();
    expectTypeOf(handlersWithCartSync).toMatchTypeOf<CustomerAccountServerHandlersWithCartSync>();
    expectTypeOf(handlersWithCartSync).toMatchTypeOf<ShopifyRouteHandlerGroup>();
    expectTypeOf(handlersFromAnnotatedOptions).toMatchTypeOf<
      CustomerAccountServerHandlersWithCartSync
    >();
    expectTypeOf(unbrandedHandlers).toMatchTypeOf<CustomerAccountServerHandlers>();
    expectTypeOf(handlers.authorize).toHaveProperty("pathname").toEqualTypeOf<
      typeof CUSTOMER_ACCOUNT_AUTHORIZE_PATH
    >();
    expectTypeOf(handlers.login).toHaveProperty("method").toEqualTypeOf<"GET">();
    expectTypeOf(handlers.logout).toHaveProperty("method").toEqualTypeOf<"POST">();
    expectTypeOf(handlers.refresh).toHaveProperty("method").toEqualTypeOf<"GET">();
  });
});
