import { afterEach, describe, expect, it } from "vitest";

import { getStorefrontBaseUrl, getStorefrontE2EWorkerCount } from "./runtime-config";

const ORIGINAL_BASE_URL = process.env.STOREFRONT_BASE_URL;
const ORIGINAL_CI = process.env.CI;
const ORIGINAL_WORKER_COUNT = process.env.STOREFRONT_E2E_WORKERS;

const DEFAULT_EXPECTED_WORKER_COUNT = 4;
const CI_EXPECTED_WORKER_COUNT = 2;
const VALID_WORKER_COUNT = 6;

describe("getStorefrontBaseUrl", () => {
  afterEach(restoreEnv);

  it("requires STOREFRONT_BASE_URL", () => {
    delete process.env.STOREFRONT_BASE_URL;

    expect(() => getStorefrontBaseUrl()).toThrow("Missing STOREFRONT_BASE_URL");
  });

  it("requires an HTTP URL", () => {
    process.env.STOREFRONT_BASE_URL = "file:///tmp/storefront";

    expect(() => getStorefrontBaseUrl()).toThrow("must use http or https");
  });

  it("returns a normalized base URL", () => {
    process.env.STOREFRONT_BASE_URL = "https://example.com/storefront";

    expect(getStorefrontBaseUrl()).toBe("https://example.com/storefront");
  });
});

describe("getStorefrontE2EWorkerCount", () => {
  afterEach(restoreEnv);

  it("uses the local default when no worker count is configured", () => {
    delete process.env.CI;
    delete process.env.STOREFRONT_E2E_WORKERS;

    expect(getStorefrontE2EWorkerCount()).toBe(DEFAULT_EXPECTED_WORKER_COUNT);
  });

  it("uses the CI default in CI", () => {
    process.env.CI = "true";
    delete process.env.STOREFRONT_E2E_WORKERS;

    expect(getStorefrontE2EWorkerCount()).toBe(CI_EXPECTED_WORKER_COUNT);
  });

  it("accepts a configured worker count", () => {
    process.env.STOREFRONT_E2E_WORKERS = String(VALID_WORKER_COUNT);

    expect(getStorefrontE2EWorkerCount()).toBe(VALID_WORKER_COUNT);
  });

  it("rejects invalid worker counts", () => {
    process.env.STOREFRONT_E2E_WORKERS = "0";

    expect(() => getStorefrontE2EWorkerCount()).toThrow("must be an integer");
  });
});

function restoreEnv(): void {
  restoreEnvValue("STOREFRONT_BASE_URL", ORIGINAL_BASE_URL);
  restoreEnvValue("CI", ORIGINAL_CI);
  restoreEnvValue("STOREFRONT_E2E_WORKERS", ORIGINAL_WORKER_COUNT);
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
