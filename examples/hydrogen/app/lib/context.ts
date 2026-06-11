import type { StorefrontRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  hydrogenContext,
  type CustomerAccount,
} from "@shopify/hydrogen-classic";
import type { LanguageCode as CustomerAccountLanguageCode } from "@shopify/hydrogen-classic/customer-account-api-types";
import { RouterContextProvider } from "react-router";

import { getLocaleFromRequest } from "~/lib/i18n";
import { AppSession } from "~/lib/session";
import { createStorefrontClientForRequest, type StorefrontClient } from "~/lib/storefront-client";

type HydrogenRouterContext = {
  storefront: StorefrontClient;
  storefrontRequestContext: StorefrontRequestContext;
  customerAccount: CustomerAccount;
  env: Env;
  session: AppSession;
  waitUntil: ExecutionContext["waitUntil"];
};

/**
 * Creates the React Router context for the Hydrogen example.
 *
 * This intentionally avoids `createHydrogenContext()` because cart and storefront
 * data now come from the dev-preview Hydrogen package. Calling Hydrogen classic's
 * full context factory would still instantiate its storefront and cart handlers
 * even though routes no longer use them.
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
  storefrontRequestContext: StorefrontRequestContext,
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
    storefrontRequestContext,
  });
  const customerAccount = createCustomerAccountClient({
    session,
    request,
    waitUntil,
    language: i18n.language as CustomerAccountLanguageCode,
    customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
    shopId: env.SHOP_ID,
  });
  const contextValues: HydrogenRouterContext = {
    storefront,
    storefrontRequestContext,
    customerAccount,
    env,
    session,
    waitUntil,
  };

  const routerContext = new RouterContextProvider();
  routerContext.set(hydrogenContext.storefront, storefront as never);
  routerContext.set(hydrogenContext.customerAccount, customerAccount);
  routerContext.set(hydrogenContext.env, env);
  routerContext.set(hydrogenContext.session, session);
  routerContext.set(hydrogenContext.waitUntil, waitUntil);

  return new Proxy(routerContext, {
    get(target, property, receiver) {
      if (property in target) {
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }

      if (property in contextValues) {
        return contextValues[property as keyof HydrogenRouterContext];
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
      if (property in contextValues) {
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: contextValues[property as keyof HydrogenRouterContext],
        };
      }
    },
  });
}
