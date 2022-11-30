import {trackCustomerPageView} from './customer-events';

type RequestData = {
  eventType: string;
  payload?: unknown;
  location: string;
  referrer: string;
  pageTitle: string;
};

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
  // Set x-forward-for to request id
  console.log('Shopify Analytics', {
    events: data,
    metadata: {
      event_sent_at_ms: Date.now(),
    },
  });
}
