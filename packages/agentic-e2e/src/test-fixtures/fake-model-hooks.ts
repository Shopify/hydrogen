// Test only. Load it with `node --import` before the CLI. It replaces `shopifyProxyModel` so the
// CLI process sends its model requests to the local fake endpoint in
// `AGENTIC_E2E_TEST_MODEL_BASE_URL`. Everything else in the model config stays as it is.
import { registerHooks } from "node:module";

const baseURL = process.env.AGENTIC_E2E_TEST_MODEL_BASE_URL ?? "";
if (baseURL === "") throw new Error("AGENTIC_E2E_TEST_MODEL_BASE_URL is not set.");

const MODEL_CONFIG_URL = new URL("../agent/model-config.ts", import.meta.url).href;
const FAKE_URL = `${MODEL_CONFIG_URL}?fake`;
// A different URL, so the resolve hook does not redirect the fake's own import.
const ORIGINAL_URL = `${MODEL_CONFIG_URL}?original`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    return resolved.url === MODEL_CONFIG_URL ? { ...resolved, url: FAKE_URL } : resolved;
  },
  load(url, context, nextLoad) {
    if (url !== FAKE_URL) return nextLoad(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: `import { shopifyProxyModel as original } from ${JSON.stringify(ORIGINAL_URL)};
export function shopifyProxyModel(env) {
  return { ...original(env), baseURL: ${JSON.stringify(baseURL)} };
}
`,
    };
  },
});
