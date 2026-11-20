// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { PRODUCT_VIEW_TAG_NAME } from "../product/product-view";
import { initializeShopifyScripts } from "./initialize";

vi.mock("./standard-events", () => ({
  importStandardEventsFromCDN: () =>
    Promise.resolve({
      createViewEventElement: () => class extends HTMLElement {},
      PageViewEvent: class extends Event {
        constructor() {
          super("shopify:page:view");
        }
      },
    } as unknown as typeof StandardEventsModule),
}));

describe("initializeShopifyScripts", () => {
  it("registers the view event elements", async () => {
    await initializeShopifyScripts({ webMcp: false });

    await vi.waitFor(() => {
      expect(customElements.get(PRODUCT_VIEW_TAG_NAME)).toBeDefined();
    });
  });
});
