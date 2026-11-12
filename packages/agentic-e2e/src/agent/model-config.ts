/** The model the agent uses and where its requests go. The key is sent only to `baseURL`. */
export interface ModelConfig {
  /** Stagehand model name: `<provider>/<model>`. */
  modelName: string;
  apiKey: string;
  baseURL: string;
  headers: Readonly<Record<string, string>>;
}

/**
 * The one supported model path: Claude Haiku through the Shopify AI proxy, with the key from
 * `SHOPIFY_PROXY_KEY`. Error messages never contain the key.
 */
export function shopifyProxyModel(env: NodeJS.ProcessEnv): ModelConfig {
  const apiKey = env.SHOPIFY_PROXY_KEY?.trim() ?? "";
  if (apiKey === "") throw new Error("SHOPIFY_PROXY_KEY is not set.");
  if (/[\r\n]/.test(apiKey)) throw new Error("SHOPIFY_PROXY_KEY must be one line.");
  return {
    modelName: "anthropic/claude-haiku-5-5",
    apiKey,
    baseURL: "https://proxy.shopify.ai/apis/anthropic/v1",
    headers: { "Shopify-Usage-Tag": "agentic-e2e" },
  };
}
