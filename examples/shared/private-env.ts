import secrets from "./secrets";

const PRIVATE_STOREFRONT_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";

type SharedSecrets = Record<string, string>;

export function getPrivateStorefrontToken(): string {
  // Prefer an explicit environment variable so anyone can run the examples
  // against their own store; fall back to the shared (decrypted) secrets file.
  const token =
    process.env[PRIVATE_STOREFRONT_TOKEN_KEY] || getSharedSecret(PRIVATE_STOREFRONT_TOKEN_KEY);
  if (!token) {
    throw new Error(
      `${PRIVATE_STOREFRONT_TOKEN_KEY} is required for SSR requests. ` +
        `Set it as an environment variable, or — with the EJSON key — run ` +
        `"pnpm run examples:secrets:decrypt" and add the token to examples/shared/secrets.ts.`,
    );
  }
  return token;
}

export function getSharedSecret(key: string): string | undefined {
  const value = (secrets as SharedSecrets)[key];
  return typeof value === "string" && value ? value : undefined;
}
