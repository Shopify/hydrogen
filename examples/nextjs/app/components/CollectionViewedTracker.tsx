"use client";

import { useEffect } from "react";

import { getAnalytics, analyticsShop, AnalyticsEvent } from "../lib/analytics";

type Props = {
  collection: { id: string; handle: string };
};

export function CollectionViewedTracker({ collection }: Props) {
  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [collection.id, collection.handle]);

  return null;
}
