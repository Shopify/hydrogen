'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {AnalyticsEvent} from '@shopify/hydrogen-temp';
import {useAnalyticsBus} from './analytics-provider';

type SearchViewedProps = {
  searchTerm: string;
};

export function SearchViewed({searchTerm}: SearchViewedProps) {
  const {bus, shop} = useAnalyticsBus();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams}` : '');
  const lastUrl = useRef('');

  useEffect(() => {
    if (!shop?.shopId) return;
    if (currentUrl === lastUrl.current) return;
    lastUrl.current = currentUrl;

    bus.publish(AnalyticsEvent.SEARCH_VIEWED, {
      shop,
      url: window.location.href,
      customData: {},
      searchTerm,
    });
  }, [currentUrl, shop?.shopId, bus, searchTerm]);

  return null;
}
