const SESSION_SECRET_MIN_LENGTH = 32;
const PLACEHOLDER_SESSION_SECRETS = new Set(["replace-with-a-long-random-secret-32-plus-chars"]);

export function getOptionalPrivateStorefrontToken(): string | undefined {
  const token = process.env.PRIVATE_STOREFRONT_API_TOKEN;
  return token && token.length > 0 ? token : undefined;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (
    !secret ||
    secret.length < SESSION_SECRET_MIN_LENGTH ||
    PLACEHOLDER_SESSION_SECRETS.has(secret)
  ) {
    throw new Error(
      `SESSION_SECRET is required and must be at least ${SESSION_SECRET_MIN_LENGTH} characters long.`,
    );
  }
  return secret;
}
