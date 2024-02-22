import { useLocation } from "@remix-run/react";
import { useAnalyticsProvider } from "./AnalyticsProvider";
import { useEffect, useRef } from "react";

export function AnalyticsCollectionViewed({
  data,
  callback
}: {
  data: Record<string, unknown>;
  callback?: (payload: unknown) => void
}) {
  const location = useLocation();
  const lastLocationKey = useRef<string>('');
  const {publish} = useAnalyticsProvider();

  useEffect(() => {
    if (lastLocationKey.current === location.key) return;

    lastLocationKey.current = location.key;

    setTimeout(() => {
      publish('collectionViewed', data);
      callback && callback(data);
    }, 0);
  }, [location]);

  return null;
}
