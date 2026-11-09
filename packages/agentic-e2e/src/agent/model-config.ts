/**
 * Model configuration for the Stagehand buyer.
 *
 * The buyer takes an explicit {@link BuyerModelConfig}. It never reads model
 * credentials from the environment. {@link resolveBuyerModel} is the one place
 * that maps environment variables to that config, so each credential goes only
 * to an endpoint chosen for it.
 */

/** Default buyer model. Stagehand model names use the `provider/model` format. */
export const DEFAULT_BUYER_MODEL = "anthropic/claude-haiku-5-5";

export interface BuyerModelConfig {
  /** Stagehand model name in the form `provider/model`. Stagehand selects the provider SDK from the prefix. */
  modelName: string;
  /** Sent only to `baseURL`, or to the provider SDK default endpoint when `baseURL` is not set. */
  apiKey: string;
  /** Provider API base URL. HTTPS, or HTTP on a loopback host for local tests. */
  baseURL?: string;
  /** Extra request headers. Not redacted, so they must not hold credentials. */
  headers?: Readonly<Record<string, string>>;
}

/**
 * Provider prefix, then one or more model path segments. Each segment starts
 * with a letter or digit, so `..` segments, spaces, and URL syntax are rejected.
 */
const MODEL_NAME =
  /^([a-z][a-z0-9-]*)\/([A-Za-z0-9][A-Za-z0-9._:-]*(?:\/[A-Za-z0-9][A-Za-z0-9._:-]*)*)$/;
const MAX_MODEL_NAME_LENGTH = 200;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const CREDENTIAL_HEADER = /authorization|api[-_]?key|cookie|token|secret|password/i;

/** Returns the provider prefix. Throws, without echoing the value, if the name is invalid. */
export function modelProvider(modelName: string): string {
  const match = modelName.length <= MAX_MODEL_NAME_LENGTH ? MODEL_NAME.exec(modelName) : null;
  if (match?.[1] === undefined) {
    throw new Error(
      'The buyer model must be a Stagehand model name in the form "<provider>/<model>".',
    );
  }
  return match[1];
}

/**
 * Checks a model API endpoint. Remote endpoints must use HTTPS; plain HTTP is
 * allowed only on a loopback host. Error messages never echo the value.
 */
export function validateEndpoint(raw: string, label: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  const secure = url.protocol === "https:";
  const loopback = url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  if (!secure && !loopback) {
    throw new Error(`${label} must use HTTPS. Plain HTTP is allowed only for localhost.`);
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new Error(`${label} must not contain credentials, a query, or a fragment.`);
  }
  return url.href.replace(/\/+$/, "");
}

/** Validates a complete config. The buyer calls this before it creates Stagehand. */
export function validateModelConfig(config: BuyerModelConfig): void {
  modelProvider(config.modelName);
  if (config.apiKey.trim() === "") {
    throw new Error("The buyer model config requires an API key.");
  }
  if (/[\r\n]/.test(config.apiKey)) {
    throw new Error("The buyer model API key must not contain line breaks.");
  }
  if (config.baseURL !== undefined) {
    validateEndpoint(config.baseURL, "The model base URL");
  }
  for (const [name, value] of Object.entries(config.headers ?? {})) {
    if (!HEADER_NAME.test(name) || /[\r\n]/.test(value)) {
      throw new Error("The model headers must have valid names and single-line values.");
    }
    if (CREDENTIAL_HEADER.test(name)) {
      throw new Error("Pass the model credential as apiKey, not as a header.");
    }
  }
}

const SHOPIFY_PROXY_HOST = "proxy.shopify.ai";

/**
 * Known Shopify AI proxy endpoints. `SHOPIFY_PROXY_KEY` is sent only to these,
 * and only for the matching provider.
 */
const SHOPIFY_PROXY_ENDPOINTS: Readonly<Record<string, string>> = {
  anthropic: `https://${SHOPIFY_PROXY_HOST}/apis/anthropic/v1`,
  openai: `https://${SHOPIFY_PROXY_HOST}/vendors/openai/v1`,
};

/** Usage attribution header sent on every request to the Shopify AI proxy. */
export const SHOPIFY_USAGE_TAG = { "Shopify-Usage-Tag": "agentic-e2e" } as const;

/** Provider-native variables. Each key is sent only to its own provider. */
const NATIVE_PROVIDERS: Readonly<
  Record<string, { apiKey: string; baseURL: string; defaultBaseURL: string }>
> = {
  anthropic: {
    apiKey: "ANTHROPIC_API_KEY",
    baseURL: "ANTHROPIC_BASE_URL",
    defaultBaseURL: "https://api.anthropic.com/v1",
  },
  openai: {
    apiKey: "OPENAI_API_KEY",
    baseURL: "OPENAI_BASE_URL",
    defaultBaseURL: "https://api.openai.com/v1",
  },
};

/**
 * Builds the buyer model config from the environment. The first match wins:
 *
 * 1. `AGENTIC_E2E_API_KEY`, sent to `AGENTIC_E2E_BASE_URL`. Without a
 *    base URL: the official endpoint for `anthropic` and `openai`, or the
 *    provider SDK default for other providers. The operator owns this pairing.
 * 2. The provider-native key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`), sent to
 *    the provider-native base URL variable or the official endpoint.
 * 3. `SHOPIFY_PROXY_KEY`, sent only to the known proxy endpoint for `anthropic`
 *    or `openai`.
 *
 * A key is never sent to a different provider. Requests to the Shopify AI
 * proxy carry {@link SHOPIFY_USAGE_TAG}. Errors never echo values.
 */
export function resolveBuyerModel(
  model: string | undefined,
  env: NodeJS.ProcessEnv,
): BuyerModelConfig {
  const modelName = model ?? DEFAULT_BUYER_MODEL;
  const { apiKey, baseURL } = chooseCredential(modelProvider(modelName), env);
  const config: BuyerModelConfig = {
    modelName,
    apiKey,
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(baseURL !== undefined && new URL(baseURL).hostname === SHOPIFY_PROXY_HOST
      ? { headers: { ...SHOPIFY_USAGE_TAG } }
      : {}),
  };
  validateModelConfig(config);
  return config;
}

function chooseCredential(
  provider: string,
  env: NodeJS.ProcessEnv,
): { apiKey: string; baseURL: string | undefined } {
  const native = Object.hasOwn(NATIVE_PROVIDERS, provider) ? NATIVE_PROVIDERS[provider] : undefined;
  const genericKey = read(env, "AGENTIC_E2E_API_KEY");
  if (genericKey !== undefined) {
    return {
      apiKey: genericKey,
      baseURL: endpointFromEnv(env, "AGENTIC_E2E_BASE_URL", native?.defaultBaseURL),
    };
  }
  if (read(env, "AGENTIC_E2E_BASE_URL") !== undefined) {
    throw new Error(
      "AGENTIC_E2E_BASE_URL requires AGENTIC_E2E_API_KEY. Other keys are not sent to it.",
    );
  }

  const nativeKey = native === undefined ? undefined : read(env, native.apiKey);
  if (native !== undefined && nativeKey !== undefined) {
    return {
      apiKey: nativeKey,
      baseURL: endpointFromEnv(env, native.baseURL, native.defaultBaseURL),
    };
  }

  const proxyKey = read(env, "SHOPIFY_PROXY_KEY");
  const proxyEndpoint = Object.hasOwn(SHOPIFY_PROXY_ENDPOINTS, provider)
    ? SHOPIFY_PROXY_ENDPOINTS[provider]
    : undefined;
  if (proxyEndpoint !== undefined && proxyKey !== undefined) {
    return { apiKey: proxyKey, baseURL: proxyEndpoint };
  }
  throw new Error(missingKeyMessage(provider, native?.apiKey));
}

/** The validated endpoint in variable `name`, or `fallback` when it is not set. */
function endpointFromEnv<T extends string | undefined>(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: T,
): string | T {
  const value = read(env, name);
  return value === undefined ? fallback : validateEndpoint(value, name);
}

function missingKeyMessage(provider: string, nativeKeyName: string | undefined): string {
  if (nativeKeyName === undefined) {
    return "No API key for the buyer model provider. Set AGENTIC_E2E_API_KEY, and AGENTIC_E2E_BASE_URL when the provider SDK default endpoint is not the target.";
  }
  return `No API key for the buyer model provider. Set AGENTIC_E2E_API_KEY, ${nativeKeyName}, or SHOPIFY_PROXY_KEY for ${provider} models.`;
}

function read(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}
