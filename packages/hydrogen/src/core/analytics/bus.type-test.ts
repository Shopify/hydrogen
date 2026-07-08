import { describe, it } from "vitest";

import { AnalyticsEvent } from "./events";
import { createStorefrontAnalytics } from "./bus";
import type { StorefrontAnalytics } from "./types";

declare const analytics: StorefrontAnalytics;

describe("analytics publish types", () => {
  it("allows payload omission only when the payload has no required fields", () => {});
});

export function analyticsPublishTypes() {
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

  // @ts-expect-error custom subscriptions are temporarily unsupported
  analytics.subscribe("custom_marketing_banner_opened", () => {});

  analytics.addDestination({
    name: "test-destination",
    setup({ subscribe }) {
      // @ts-expect-error custom destination subscriptions are temporarily unsupported
      subscribe("custom_marketing_banner_opened", () => {});
    },
  });
}

export function analyticsOptionsTypes() {
  createStorefrontAnalytics({
    shop: null,
    consent: {},
    shopifyAnalytics: false,
  });

  createStorefrontAnalytics({
    shop: null,
    consent: {},
    // @ts-expect-error shopifyAnalytics only accepts boolean
    shopifyAnalytics: {},
  });
}
