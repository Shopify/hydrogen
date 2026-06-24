import secrets from "./secrets";

const PRIVATE_STOREFRONT_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";

type SharedSecrets = Record<string, string>;

export function getPrivateStorefrontToken(): string {
  const token = getSharedSecret(PRIVATE_STOREFRONT_TOKEN_KEY);
  if (!token) {
    throw new Error(`Missing ${PRIVATE_STOREFRONT_TOKEN_KEY} is required for SSR requests.`);
  }
  return token;
}

export function getSharedSecret(key: string): string | undefined {
  const fromSecrets = (secrets as SharedSecrets)[key];
  if (typeof fromSecrets === "string" && fromSecrets) return fromSecrets;

  if (typeof process === "undefined" || !process.env) return undefined;
  const fromEnv = process.env[key];
  return typeof fromEnv === "string" && fromEnv ? fromEnv : undefined;
}
