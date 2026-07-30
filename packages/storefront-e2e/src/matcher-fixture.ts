import { test as base } from "@playwright/test";
import type { StorefrontClient } from "@shopify/hydrogen";

import { getStorefrontBaseUrl } from "./runtime-config";
import { createStorefrontApiClient } from "./storefront-api-discovery";

const MATCHER_TIMEOUT_MS = 60_000;

export class AbortSuiteError extends Error {
  constructor(reason: string) {
    super(`Aborting suite: ${reason}`);
    this.name = "AbortSuiteError";
  }
}

export class SkipTestGroupError extends Error {
  constructor(reason: string) {
    super(`Skipping test group: ${reason}`);
    this.name = "SkipTestGroupError";
  }
}

export type MatcherContext = {
  readonly storefrontBaseUrl: string;
  readonly storefrontClient: StorefrontClient;
};

export type TestMatcher<TData> = {
  readonly discover: (
    context: MatcherContext,
  ) => { readonly data: TData } | Promise<{ readonly data: TData }>;
};

type MatcherState<TData> =
  | { readonly status: "ready"; readonly data: TData }
  | { readonly status: "skipped"; readonly reason: string };

export function createTest<TData>(matcher: TestMatcher<TData>) {
  return base.extend<{ data: TData }, { matcherState: MatcherState<TData> }>({
    matcherState: [
      async ({ browserName: _browserName }, use) => {
        const storefrontBaseUrl = getStorefrontBaseUrl();
        const storefrontClient = createStorefrontApiClient(storefrontBaseUrl);

        try {
          const { data } = await matcher.discover({
            storefrontBaseUrl,
            storefrontClient,
          });
          await use({ status: "ready", data });
        } catch (error) {
          if (error instanceof SkipTestGroupError) {
            await use({ status: "skipped", reason: error.message });
            return;
          }

          throw error;
        }
      },
      { scope: "worker", timeout: MATCHER_TIMEOUT_MS },
    ],

    data: async ({ matcherState }, use, testInfo) => {
      if (matcherState.status === "skipped") {
        testInfo.skip(true, matcherState.reason);
        return;
      }

      await use(matcherState.data);
    },
  });
}
