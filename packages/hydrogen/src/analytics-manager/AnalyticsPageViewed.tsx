import { useLocation } from "@remix-run/react";
import { useAnalyticsProvider } from "./AnalyticsProvider";
import { useEffect, useRef } from "react";

export function AnalyticsPageViewed({callback}: { callback?: (payload: unknown) => void}) {
  const location = useLocation();
  const lastLocationKey = useRef<string>('');
  const {publish} = useAnalyticsProvider();

  // Page view analytics
  // We want useEffect to execute only when location changes
  // which represents a page view
  useEffect(() => {
    if (lastLocationKey.current === location.key) return;

    lastLocationKey.current = location.key;

    const payload = {
      url: location.pathname,
    };

    publish('pageViewed', payload);
    callback && callback(payload);
  }, [location]);
}
