'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {AnalyticsEvent} from '@shopify/hydrogen-temp';
import {useAnalyticsBus} from './analytics-provider';

type CollectionViewedProps = {
  collection: {
    id: string;
    handle: string;
  };
};

export function CollectionViewed({collection}: CollectionViewedProps) {
  const {bus, shop} = useAnalyticsBus();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams}` : '');
  const lastUrl = useRef('');

  useEffect(() => {
    if (!shop?.shopId) return;
    if (currentUrl === lastUrl.current) return;
    lastUrl.current = currentUrl;

    bus.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      shop,
      url: window.location.href,
      customData: {},
      collection: {
        id: collection.id,
        handle: collection.handle,
      },
    });
  }, [currentUrl, shop?.shopId, bus, collection]);

  return null;
}
