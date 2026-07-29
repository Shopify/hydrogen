"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { addAnalyticsConsoleDestination, AnalyticsEvent, getAnalytics } from "@/lib/analytics";

/**
 * Root analytics tracker (`hydrogen-analytics` / `references/react.md` Next.js
 * App Router shape). Keys the `PAGE_VIEWED` effect by `pathname + "?" + search`
 * so client navigations fire a fresh page view (F9: no polling). Wrapped in
 * `<Suspense>` in `Providers` so the `useSearchParams()` CSR bailout is scoped
 * to the tracker, not the whole layout.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    const cleanup = addAnalyticsConsoleDestination();
    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey]);

  return null;
}
