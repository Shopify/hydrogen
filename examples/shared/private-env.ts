const PRIVATE_STOREFRONT_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";

type RuntimeEnv = Record<string, string | undefined>;

export function getPrivateStorefrontToken(env?: object | null): string {
  return getSharedSecret(PRIVATE_STOREFRONT_TOKEN_KEY, env);
}

export function getSharedSecret(key: string, env?: object | null): string {
  const value = getOptionalSharedSecret(key, env);
  if (!value) {
    throw new Error(
      `${key} is required. ` +
        `Run "pnpm run examples:secrets:decrypt" to create local example env files, or set it in the environment.`,
    );
  }
  return value;
}

export function getOptionalSharedSecret(key: string, env?: object | null): string | undefined {
  const value = getRuntimeEnv(env)[key];
  return isPresentString(value) ? value : undefined;
}

function getRuntimeEnv(env?: object | null): RuntimeEnv {
  const globalEnv = (
    globalThis as {
      process?: { env?: RuntimeEnv };
    }
  ).process?.env;

  const metaEnv = (import.meta as ImportMeta & { env?: RuntimeEnv }).env;
  const explicitEnv = env as RuntimeEnv | undefined;

  return { ...metaEnv, ...globalEnv, ...explicitEnv };
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
