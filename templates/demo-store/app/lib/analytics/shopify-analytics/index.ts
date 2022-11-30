import type {RequestData} from '../types';
import {trackCustomerPageView} from './customer-events';

export function sentToShopifyAnalytics({
  request,
  requestData,
  analyticsData,
}: {
  request: Request;
  requestData: RequestData;
  analyticsData: unknown;
}) {
  // Pick up cookies, useragent from request

  switch (requestData.eventType) {
    case 'pageview':
      trackCustomerPageView(
        {
          requestData,
          analyticsData,
        },
        (data) => sentToShopify(request, data),
      );
      break;
  }
}

function sentToShopify(request: Request, data: any[]) {
  // Set x-forward-for to request ip
  console.log('Shopify Analytics', {
    events: data,
    metadata: {
      event_sent_at_ms: Date.now(),
    },
  });
}
