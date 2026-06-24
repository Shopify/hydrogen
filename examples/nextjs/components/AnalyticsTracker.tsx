"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getAnalytics, analyticsShop, AnalyticsEvent } from "@/lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const key = `${pathname}?${search}`;

  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [key]);

  return null;
}
