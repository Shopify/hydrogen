/** The key-value store shape Hydrogen's Storefront client accepts as `cache`; `ttl` is in seconds. */
export interface StorefrontCache {
  get(key: string): unknown;
  set(key: string, value: unknown, options?: { ttl?: number }): void;
  delete(key: string): void;
}

/** Environment variables. `node --env-file-if-exists=.env` loads them from `.env`. */
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

/** Values the app reads through router context: process-wide config plus the request's client. */
export interface Runtime {
  env: Env;
  cache: StorefrontCache;
  /** The client address from the Node server, used as the buyer IP for private Storefront API requests. */
  buyerIp: string;
}

const DEVELOPMENT_SESSION_SECRET = "local-dev-session-secret-32-characters";
const SESSION_SECRET_MIN_LENGTH = 32;

const REQUIRED_KEYS = [
  "PUBLIC_STORE_DOMAIN",
  "SESSION_SECRET",
  "SHOP_ID",
  "PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID",
] as const;

/** Reads and validates the environment once, so the server fails before it starts listening. */
export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]);
  if (missing.length) {
    throw new Error(
      `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required. Copy .env.example to .env to run the example.`,
    );
  }

  const sessionSecret = source.SESSION_SECRET ?? "";
  const isDevelopment = source.NODE_ENV === "development" || source.NODE_ENV === "test";
  if (
    !isDevelopment &&
    (sessionSecret.length < SESSION_SECRET_MIN_LENGTH ||
      sessionSecret === DEVELOPMENT_SESSION_SECRET)
  ) {
    throw new Error(
      `SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters and must not use the example value outside development and tests.`,
    );
  }

  return {
    PUBLIC_STORE_DOMAIN: source.PUBLIC_STORE_DOMAIN ?? "",
    PRIVATE_STOREFRONT_API_TOKEN: source.PRIVATE_STOREFRONT_API_TOKEN || undefined,
    PUBLIC_STOREFRONT_API_TOKEN: source.PUBLIC_STOREFRONT_API_TOKEN || undefined,
    PUBLIC_STOREFRONT_ID: source.PUBLIC_STOREFRONT_ID || undefined,
    SESSION_SECRET: source.SESSION_SECRET ?? "",
    SHOP_ID: source.SHOP_ID ?? "",
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: source.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID ?? "",
  };
}
