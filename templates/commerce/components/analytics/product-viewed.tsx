'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {AnalyticsEvent} from '@shopify/hydrogen-temp';
import {useAnalyticsBus} from './analytics-provider';

type ProductViewedProps = {
  product: {
    id: string;
    title: string;
    vendor: string;
  };
  variant: {
    id: string;
    title: string;
    price: string;
  };
};

export function ProductViewed({product, variant}: ProductViewedProps) {
  const {bus, shop} = useAnalyticsBus();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams}` : '');
  const lastUrl = useRef('');

  useEffect(() => {
    if (!shop?.shopId) return;
    if (currentUrl === lastUrl.current) return;
    lastUrl.current = currentUrl;

    bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      shop,
      url: window.location.href,
      customData: {},
      products: [
        {
          id: product.id,
          title: product.title,
          price: variant.price,
          vendor: product.vendor,
          variantId: variant.id,
          variantTitle: variant.title,
          quantity: 1,
        },
      ],
    });
  }, [currentUrl, shop?.shopId, bus, product, variant]);

  return null;
}
