import assert from "node:assert/strict";
import test from "node:test";

import type { StorefrontModeConfig } from "../storefront/storefront-config.ts";

type TestNuxtApp = {
  ssrContext: {
    event: {
      context: {
        storefrontConfig: StorefrontModeConfig & {
          privateStorefrontToken: string;
          unexpectedSecret: string;
        };
      };
    };
  };
};
type PluginSetup = (nuxtApp: TestNuxtApp) => void;
const sharedState: { value: StorefrontModeConfig | undefined } = { value: undefined };

// Nuxt auto-imports these two helpers. The node test supplies only their state contract.
Object.assign(globalThis, {
  defineNuxtPlugin: (setup: PluginSetup) => setup,
  useState: (key: string) => {
    assert.equal(key, "storefront-config");
    return sharedState;
  },
});

const { default: plugin } = await import("../plugins/storefront-config.ts");
const initializeStorefrontConfig = plugin as unknown as PluginSetup;

test("SSR projects only mode and storeDomain into the public payload", () => {
  initializeStorefrontConfig({
    ssrContext: {
      event: {
        context: {
          storefrontConfig: {
            mode: "private",
            storeDomain: "shared-store.myshopify.com",
            privateStorefrontToken: "must-not-be-public",
            unexpectedSecret: "also-private",
          },
        },
      },
    },
  });

  assert.deepEqual(sharedState.value, {
    mode: "private",
    storeDomain: "shared-store.myshopify.com",
  });
});
