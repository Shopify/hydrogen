// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";

import { setupStorefrontAnalytics } from "../core/analytics/bus";
import type { ConsentSetup } from "../core/analytics/types";
import * as shopifyScripts from "../core/shopify-scripts";
import { assert } from "../core/test-utils";
import type { ShopifyGlobal } from "../globals";
import { ShopifyScripts } from "./shopify-scripts";

afterEach(() => {
  cleanup();
  delete window.Shopify;
  vi.restoreAllMocks();
});

it("synchronizes once across Strict Mode and remounts, and stays active after unmount", async () => {
  vi.spyOn(shopifyScripts, "getShopifyScriptTags").mockReturnValue({
    tags: [],
    scripts: [],
    links: [],
  });
  window.Shopify = {
    customerPrivacy: {
      consentStatus: "loaded",
      analyticsProcessingAllowed: () => true,
      setTrackingConsent: vi
        .fn<ShopifyGlobal["customerPrivacy"]["setTrackingConsent"]>()
        .mockResolvedValue(undefined),
    },
  } as unknown as ShopifyGlobal;
  const { bus, destroy } = setupStorefrontAnalytics({
    shop: null,
    consent: { mode: "custom-banner" },
  });
  onTestFinished(destroy);
  const destination = vi.fn();
  bus.addDestination({
    name: "test",
    setup: ({ subscribe }) => {
      subscribe("page_viewed", destination);
    },
  });
  let write: Promise<unknown> | undefined;
  const setup = vi.fn<ConsentSetup>(async () => {
    assert(window.Shopify, "Expected Shopify global");
    write = window.Shopify.customerPrivacy.setTrackingConsent({
      analytics: true,
      marketing: true,
      preferences: true,
      sale_of_data: true,
    });
    await write;
  });

  const { unmount } = render(
    <StrictMode>
      <ShopifyScripts
        shop={{ shopId: "42", storefrontId: "1", myshopifyDomain: "test.myshopify.com" }}
        consent={{ mode: "custom-banner", setup }}
        webMcp={false}
      />
    </StrictMode>,
  );
  expect(setup).toHaveBeenCalledOnce();
  expect(window.Shopify?.customerPrivacy.setTrackingConsent).toHaveBeenCalledOnce();
  bus.publish("page_viewed");
  expect(destination).not.toHaveBeenCalled();
  unmount();
  await write;
  await vi.waitFor(() => expect(destination).toHaveBeenCalledOnce());

  const replacement = vi.fn();
  const remounted = render(
    <ShopifyScripts
      shop={{ shopId: "42", storefrontId: "1", myshopifyDomain: "test.myshopify.com" }}
      consent={{ mode: "custom-banner", setup: replacement }}
      webMcp={false}
    />,
  );
  expect(replacement).not.toHaveBeenCalled();
  remounted.unmount();
  bus.publish("page_viewed");
  expect(destination).toHaveBeenCalledTimes(2);
});
