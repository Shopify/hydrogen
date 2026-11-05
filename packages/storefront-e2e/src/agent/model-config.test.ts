import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUYER_MODEL,
  modelCredentials,
  resolveBuyerModel,
  SHOPIFY_PROXY_ENDPOINTS,
  validateEndpoint,
} from "./model-config.ts";

// Dummy values only. Each test passes its own env object, so inherited
// variables such as SHOPIFY_PROXY_KEY never reach the resolver.
const GENERIC_KEY = "generic-dummy-key-000000";
const OPENAI_KEY = "sk-openai-dummy-key-000000";
const ANTHROPIC_KEY = "sk-ant-dummy-key-000000";
const PROXY_KEY = "proxy-dummy-key-000000";
const USAGE_TAG = { "Shopify-Usage-Tag": "storefront-e2e" };

function errorOf(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
  }
  throw new Error("Expected an Error to be thrown");
}

describe("resolveBuyerModel", () => {
  it("defaults to Claude Haiku 5.5 with the native Anthropic key and endpoint", () => {
    expect(DEFAULT_BUYER_MODEL).toBe("anthropic/claude-haiku-5-5");
    expect(resolveBuyerModel(undefined, { ANTHROPIC_API_KEY: ANTHROPIC_KEY })).toEqual({
      modelName: "anthropic/claude-haiku-5-5",
      apiKey: ANTHROPIC_KEY,
      baseURL: "https://api.anthropic.com/v1",
    });
  });

  it("sends SHOPIFY_PROXY_KEY only to the known proxy endpoint, with the usage tag", () => {
    expect(resolveBuyerModel(undefined, { SHOPIFY_PROXY_KEY: PROXY_KEY })).toEqual({
      modelName: "anthropic/claude-haiku-5-5",
      apiKey: PROXY_KEY,
      baseURL: "https://proxy.shopify.ai/apis/anthropic/v1",
      headers: USAGE_TAG,
    });
    expect(resolveBuyerModel("openai/gpt-4.1-mini", { SHOPIFY_PROXY_KEY: PROXY_KEY })).toEqual({
      modelName: "openai/gpt-4.1-mini",
      apiKey: PROXY_KEY,
      baseURL: "https://proxy.shopify.ai/vendors/openai/v1",
      headers: USAGE_TAG,
    });
    expect(SHOPIFY_PROXY_ENDPOINTS).toEqual({
      anthropic: "https://proxy.shopify.ai/apis/anthropic/v1",
      openai: "https://proxy.shopify.ai/vendors/openai/v1",
    });
  });

  it("ignores native base URL variables when it uses the proxy key", () => {
    const config = resolveBuyerModel(undefined, {
      SHOPIFY_PROXY_KEY: PROXY_KEY,
      ANTHROPIC_BASE_URL: "https://elsewhere.example/v1",
      OPENAI_API_KEY: OPENAI_KEY,
    });
    expect(config.apiKey).toBe(PROXY_KEY);
    expect(config.baseURL).toBe("https://proxy.shopify.ai/apis/anthropic/v1");
  });

  it("keeps OPENAI_API_KEY and OPENAI_BASE_URL for OpenAI models", () => {
    expect(
      resolveBuyerModel("openai/gpt-4.1-mini", {
        OPENAI_API_KEY: OPENAI_KEY,
        OPENAI_BASE_URL: "http://127.0.0.1:4010/v1/",
        SHOPIFY_PROXY_KEY: PROXY_KEY,
      }),
    ).toEqual({
      modelName: "openai/gpt-4.1-mini",
      apiKey: OPENAI_KEY,
      baseURL: "http://127.0.0.1:4010/v1",
    });
  });

  it("uses ANTHROPIC_BASE_URL with ANTHROPIC_API_KEY", () => {
    expect(
      resolveBuyerModel(undefined, {
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        ANTHROPIC_BASE_URL: "http://localhost:4010/v1",
      }).baseURL,
    ).toBe("http://localhost:4010/v1");
  });

  it.each([
    ["anthropic/claude-haiku-5-5", { OPENAI_API_KEY: OPENAI_KEY }, OPENAI_KEY],
    ["openai/gpt-4.1-mini", { ANTHROPIC_API_KEY: ANTHROPIC_KEY }, ANTHROPIC_KEY],
    ["google/gemini-2.5-flash", { SHOPIFY_PROXY_KEY: PROXY_KEY }, PROXY_KEY],
    [
      "google/gemini-2.5-flash",
      { OPENAI_API_KEY: OPENAI_KEY, ANTHROPIC_API_KEY: ANTHROPIC_KEY },
      OPENAI_KEY,
    ],
  ])("never sends another provider's key: %s", (model, env, key) => {
    const error = errorOf(() => resolveBuyerModel(model, env));
    expect(error.message).toMatch(/^No API key for the buyer model provider\./);
    expect(error.message).not.toContain(key);
  });

  it("prefers STOREFRONT_E2E_API_KEY and pairs it only with STOREFRONT_E2E_BASE_URL", () => {
    const env = {
      STOREFRONT_E2E_API_KEY: GENERIC_KEY,
      STOREFRONT_E2E_BASE_URL: "https://gateway.example/anthropic/v1",
      ANTHROPIC_API_KEY: ANTHROPIC_KEY,
      ANTHROPIC_BASE_URL: "https://other.example/v1",
      SHOPIFY_PROXY_KEY: PROXY_KEY,
    };
    expect(resolveBuyerModel(undefined, env)).toEqual({
      modelName: "anthropic/claude-haiku-5-5",
      apiKey: GENERIC_KEY,
      baseURL: "https://gateway.example/anthropic/v1",
    });
  });

  it("sends the generic key to the official endpoint when no generic base URL is set", () => {
    expect(
      resolveBuyerModel("openai/gpt-4.1-mini", {
        STOREFRONT_E2E_API_KEY: GENERIC_KEY,
        OPENAI_BASE_URL: "https://other.example/v1",
      }).baseURL,
    ).toBe("https://api.openai.com/v1");
  });

  it("supports other Stagehand providers only with the explicit generic key", () => {
    expect(
      resolveBuyerModel("google/gemini-2.5-flash", { STOREFRONT_E2E_API_KEY: GENERIC_KEY }),
    ).toEqual({ modelName: "google/gemini-2.5-flash", apiKey: GENERIC_KEY });
    expect(
      resolveBuyerModel("mockprovider/model-x", {
        STOREFRONT_E2E_API_KEY: GENERIC_KEY,
        STOREFRONT_E2E_BASE_URL: "https://models.example/v1",
      }),
    ).toEqual({
      modelName: "mockprovider/model-x",
      apiKey: GENERIC_KEY,
      baseURL: "https://models.example/v1",
    });
  });

  it("adds the usage tag when an explicit generic endpoint is the Shopify proxy", () => {
    expect(
      resolveBuyerModel(undefined, {
        STOREFRONT_E2E_API_KEY: GENERIC_KEY,
        STOREFRONT_E2E_BASE_URL: "https://proxy.shopify.ai/apis/anthropic/v1",
      }).headers,
    ).toEqual(USAGE_TAG);
  });

  it("refuses STOREFRONT_E2E_BASE_URL without STOREFRONT_E2E_API_KEY", () => {
    const error = errorOf(() =>
      resolveBuyerModel(undefined, {
        STOREFRONT_E2E_BASE_URL: "https://gateway.example/v1",
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        SHOPIFY_PROXY_KEY: PROXY_KEY,
      }),
    );
    expect(error.message).toContain("requires STOREFRONT_E2E_API_KEY");
    expect(error.message).not.toContain("gateway.example");
  });

  it.each([
    [{ OPENAI_API_KEY: OPENAI_KEY, OPENAI_BASE_URL: "http://models.example/v1" }, "must use HTTPS"],
    [
      { OPENAI_API_KEY: OPENAI_KEY, OPENAI_BASE_URL: `https://u:${OPENAI_KEY}@models.example/v1` },
      "must not contain credentials",
    ],
    [
      { STOREFRONT_E2E_API_KEY: GENERIC_KEY, STOREFRONT_E2E_BASE_URL: "ftp://models.example" },
      "must use HTTPS",
    ],
  ])("rejects an unsafe endpoint without echoing it (%#)", (env, message) => {
    const error = errorOf(() => resolveBuyerModel("openai/gpt-4.1-mini", env));
    expect(error.message).toContain(message);
    expect(error.message).not.toContain("models.example");
    expect(error.message).not.toContain(OPENAI_KEY);
  });

  it.each(["gpt-4.1-mini", "openai/../x", `${PROXY_KEY} openai/x`, "openai/x?y=1"])(
    "rejects the invalid model %j without echoing it",
    (model) => {
      const error = errorOf(() => resolveBuyerModel(model, { SHOPIFY_PROXY_KEY: PROXY_KEY }));
      expect(error.message).toBe(
        'The buyer model must be a Stagehand model name in the form "<provider>/<model>".',
      );
    },
  );
});

describe("validateEndpoint", () => {
  it.each(["http://localhost:1/v1", "http://127.0.0.1:1/v1", "http://[::1]:1/v1"])(
    "allows plain HTTP on the loopback host %s",
    (url) => {
      expect(validateEndpoint(url, "URL")).toBe(url);
    },
  );

  it("removes a trailing slash", () => {
    expect(validateEndpoint("https://models.example/v1/", "URL")).toBe("https://models.example/v1");
  });
});

describe("modelCredentials", () => {
  it("lists every non-empty credential variable value", () => {
    expect(
      modelCredentials({
        STOREFRONT_E2E_API_KEY: GENERIC_KEY,
        OPENAI_API_KEY: " ",
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        SHOPIFY_PROXY_KEY: PROXY_KEY,
        LLM_GATEWAY_TOKEN: "not-read-000000",
      }),
    ).toEqual([GENERIC_KEY, ANTHROPIC_KEY, PROXY_KEY]);
  });
});
