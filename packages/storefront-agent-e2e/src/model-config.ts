import type { ModelConfig } from "./agent";

export function readModelConfig(): ModelConfig {
  const name = requireEnv("STOREFRONT_AGENT_MODEL");
  if (!/^[a-z]+\/.+/.test(name)) {
    throw new Error('STOREFRONT_AGENT_MODEL must be provider-prefixed, e.g. "anthropic/<model>".');
  }
  return {
    name,
    url: requireEnv("STOREFRONT_AGENT_MODEL_URL"),
    token: requireEnv("STOREFRONT_AGENT_MODEL_TOKEN"),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Missing ${name}. Set it in packages/storefront-agent-e2e/.env.local.`);
  return value;
}
