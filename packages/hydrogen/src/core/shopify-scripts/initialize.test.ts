// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { initializeShopifyScripts } from "./initialize";
import { VIEW_EVENT_TAG_NAME } from "./view-event-element";

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
  it("registers the view event element", async () => {
    await initializeShopifyScripts({ webMcp: false });

    await vi.waitFor(() => {
      expect(customElements.get(VIEW_EVENT_TAG_NAME)).toBeDefined();
    });
  });
});
