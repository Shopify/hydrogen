import { useEffect } from "react";
import { useLocation } from "react-router";

import { AnalyticsEvent, analyticsShop, getAnalytics } from "../lib/analytics";

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [location.pathname, location.search]);

  return null;
}
