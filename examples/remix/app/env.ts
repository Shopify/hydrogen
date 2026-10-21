/** Worker bindings. MiniOxygen loads them from `.env`; Oxygen injects them per deployment. */
export interface Env {
  PUBLIC_STORE_DOMAIN: string;
  /** Enables buyer-aware server rendering. Without it, the public token is used. */
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_STOREFRONT_API_TOKEN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
}

/** Request-scoped Worker values that the app reads through router context. */
export interface Runtime {
  env: Env;
  cache: Cache;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Reads a required binding, failing with setup instructions when `.env` is missing it. */
export function requireEnv<Key extends keyof Env>(env: Env, key: Key): NonNullable<Env[Key]> {
  const value = env[key];
  if (!value) throw new Error(`${key} is required. Copy .env.example to .env to run the example.`);
  return value as NonNullable<Env[Key]>;
}
