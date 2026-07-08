import type { ShopifyRequestContext } from "@shopify/hydrogen";
import { RouterContextProvider } from "react-router";

import { getLocaleFromRequest } from "~/lib/i18n";
import { AppSession } from "~/lib/session";
import { createStorefrontClientForRequest, type StorefrontClient } from "~/lib/storefront-client";

import type { CustomerAccountContext } from "./customer-account";

type HydrogenRouterContext = {
  storefront: StorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
  customerAccount: CustomerAccountContext;
  env: Env;
  session: AppSession;
  waitUntil: ExecutionContext["waitUntil"];
};

/**
 * Creates the React Router context for the Hydrogen example.
 *
 * This intentionally avoids `createHydrogenContext()` because cart and storefront
 * data now come from the dev-preview Hydrogen package. Calling the old Hydrogen
 * full context factory would still instantiate its storefront and cart handlers
 * even though routes no longer use them.
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
  shopifyRequestContext: ShopifyRequestContext,
  customerAccount: CustomerAccountContext,
) {
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open("hydrogen"),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);
  const i18n = getLocaleFromRequest(request);
  const storefront = createStorefrontClientForRequest({
    request,
    env,
    cache,
    waitUntil,
    i18n,
    shopifyRequestContext,
  });
  const contextValues: HydrogenRouterContext = {
    storefront,
    shopifyRequestContext,
    customerAccount,
    env,
    session,
    waitUntil,
  };

  const routerContext = new RouterContextProvider();

  return new Proxy(routerContext, {
    get(target, property, receiver) {
      if (property in target) {
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }

      if (isHydrogenRouterContextKey(property)) {
        return contextValues[property];
      }

      return Reflect.get(target, property, receiver);
    },
    has(target, property) {
      return property in target || property in contextValues;
    },
    ownKeys(target) {
      return [...Reflect.ownKeys(target), ...Object.keys(contextValues)];
    },
    getOwnPropertyDescriptor(target, property) {
      if (property in target) return Reflect.getOwnPropertyDescriptor(target, property);
      if (isHydrogenRouterContextKey(property)) {
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: contextValues[property],
        };
      }
    },
  });
}

function isHydrogenRouterContextKey(
  property: PropertyKey,
): property is keyof HydrogenRouterContext {
  return typeof property === "string" && property in contextValuesForTypeCheck;
}

const contextValuesForTypeCheck: Record<keyof HydrogenRouterContext, true> = {
  customerAccount: true,
  env: true,
  session: true,
  shopifyRequestContext: true,
  storefront: true,
  waitUntil: true,
};
