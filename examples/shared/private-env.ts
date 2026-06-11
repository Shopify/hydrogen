import secrets from "./secrets";

const PRIVATE_STOREFRONT_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";

type SharedSecrets = Record<string, string>;

export function getPrivateStorefrontToken(): string {
  const token = getSharedSecret(PRIVATE_STOREFRONT_TOKEN_KEY);
  if (!token) {
    throw new Error(
      `${PRIVATE_STOREFRONT_TOKEN_KEY} is required for SSR requests. ` +
        `Run "pnpm run examples:secrets:decrypt" to create examples/shared/secrets.ts.`,
    );
  }
  return token;
}

export function getSharedSecret(key: string): string | undefined {
  const value = (secrets as SharedSecrets)[key];
  return typeof value === "string" && value ? value : undefined;
}
