import type { CacheInstance } from "@shopify/hydrogen";
import { createContext } from "react-router";

export type Env = {
  MOCK_SHOP?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  PUBLIC_SITE_ORIGIN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  PUBLIC_STORE_DOMAIN?: string;
  CUSTOMER_ACCOUNT_SESSION_SECRET?: string;
  SHOP_ID?: string;
};

export const envContext = createContext<Env>();
export const cacheContext = createContext<CacheInstance>();
export const waitUntilContext = createContext<ExecutionContext["waitUntil"]>();

export function getEnvValue(env: Env, key: keyof Env): string | undefined {
  const value = env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
