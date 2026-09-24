import { describe, it, expectTypeOf } from "vitest";

import type {
  AnalyticsTrackingValues,
  ShopifyGlobal,
  StorefrontAnalyticsDestinationEventContext,
} from "../index";
import { AnalyticsEvent } from "./events";
import type { StorefrontAnalytics } from "./types";

declare const analytics: StorefrontAnalytics;
declare const privacy: ShopifyGlobal["customerPrivacy"];

describe("analytics publish types", () => {
  it("allows payload omission only when the payload has no required fields", () => {});
});

export function analyticsPublishTypes() {
  // @ts-expect-error consent token internals are not part of the public ShopifyGlobal type
  privacy.__internal;

  // @ts-expect-error consent token internals are not exposed on window.Shopify
  window.Shopify?.customerPrivacy.__internal;

  analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  analytics.publish(AnalyticsEvent.PAGE_VIEWED, {});

  // @ts-expect-error custom events are temporarily unsupported
  analytics.publish("custom_marketing_banner_opened");

  // @ts-expect-error unknown events are unsupported
  analytics.publish("unknown_event");

  // @ts-expect-error product views require products
  analytics.publish(AnalyticsEvent.PRODUCT_VIEWED);

  // @ts-expect-error product views require products
  analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {});

  // @ts-expect-error search views require a search term
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED);

  // @ts-expect-error event subscriptions are only available inside destination setup
  analytics.subscribe("page_viewed", () => {});

  // @ts-expect-error the global analytics bus also exposes only destination subscriptions
  window.Shopify?.analytics?.subscribe("page_viewed", () => {});

  // @ts-expect-error Hydrogen owns the bus lifecycle
  analytics.destroy();

  // @ts-expect-error internal teardown is not exposed on the global analytics bus
  window.Shopify?.analytics?.destroy();

  analytics.addDestination({
    name: "test-destination",
    setup({ subscribe }) {
      subscribe("search_viewed", (payload, context) => {
        expectTypeOf(payload.searchTerm).toEqualTypeOf<string>();
        expectTypeOf(context).toEqualTypeOf<StorefrontAnalyticsDestinationEventContext>();
        expectTypeOf(context.getTrackingValues()).toEqualTypeOf<AnalyticsTrackingValues>();

        // @ts-expect-error the destination name determines the tag
        context.getTrackingValues({ tag: "custom" });
      });

      // @ts-expect-error custom destination subscriptions are temporarily unsupported
      subscribe("custom_marketing_banner_opened", () => {});
    },
  });
}
