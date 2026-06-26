import { createContext } from "react-router";

/**
 * Runtime environment delivered by Oxygen / workerd via the worker `env`
 * binding. In dev, `shopify hydrogen dev` populates these from `.env`.
 *
 * Only runtime values live here. `NODE_ENV` is inlined by Vite at build time,
 * so it is read directly from `process.env` where needed.
 */
export interface Env {
  /** Set to "1" for the tokenless mock.shop demo. */
  MOCK_SHOP?: string;
  /** Private Storefront API token for SSR requests against a real store. */
  PRIVATE_STOREFRONT_API_TOKEN?: string;
}

/** Request-scoped access to the worker `env` binding (set in server.ts). */
export const envContext = createContext<Env>();
