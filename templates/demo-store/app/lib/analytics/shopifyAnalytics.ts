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
  console.log(requestData, analyticsData);

  switch (requestData.eventType) {
    case 'pageview':
      break;
  }
}

function sentToShopify(data: any[]) {
  return {
    events: data,
    metadata: {
      event_sent_at_ms: Date.now(),
    },
  };
}
