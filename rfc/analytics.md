# Analytics on Hydrogen Remix

One of the biggest problems that we see with analytics in general is the constant movement
of data moving from server side to client side. With the latest trend of server analytics, now
we need to consider the same set of analytic data to be also pass back to server side.

The same set of analytics data is manipulated multiple times and per client per analytic framework.
Sometimes, we query even more data so that we meet the analytics requirements of multiple analytics
framework and these data will never seen by the visitors.

With Remix, we want to rethink how this all works to achieve the following:

1. Reduce the amount of data traveling over the network
2. Reduce the code needed, on the client side, to manipulate data for analytics

# **Back to the basics** - What if we can have analytics without javascript?

**Challenge accepted** - Without javascript, we can only achieve analytics tracking with either
image pixels or iframe with a bunch of search parameters wrapped in a `<noscript>`

```html
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-123456" height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

There are limitations with this approach on

* The amount of data you can pass with a url
* Only select few client information can be passed cross domain

Reference: https://www.analyticsmania.com/post/google-tag-manager-noscript/

# Instrumenting event on client side

**Common scenario:** Collect analytics about a product view page

An example of product data that one can send to Google Analytics 4:

```json
items: [
  {
    item_id: "SKU_12345",
    item_name: "Stan and Friends Tee",
    affiliation: "Google Merchandise Store",
    currency: "USD",
    item_brand: "Google",
    item_category: "Apparel",
    item_category2: "Adult",
    item_category3: "Shirts",
    item_category4: "Crew",
    item_category5: "Short sleeve",
    item_variant: "green",
    price: 9.99,
  }
]
```

Reference: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag

Visually, a buyer will only need to see item name, item price, item variant, and currency in order to
determine if they want to add an item to a cart. However, the analytics requirements can request for more
data that the buyer would never see.

All we really from the client side are the critical information required to make additional SFAPI calls
for the analytics data we need. For example, for product page view, we just need the product handle
and we can query for the analytics data.

<h2 align="center">But hold on, aren't we making 2 query calls per page in this case?</h2>

Yes, we are but we can cache this set of data for a very long time. There are no time dependency for it.


We can attach the eventing mechanism to loaders and actions.

```jsx
// routes/products/$productHandle.jsx

export const loader() {
  return json({
    analytics: [{  // type of AnalyticsEvents
      eventName: 'PRODUCT_VIEW'
    }]
  })
}

export const action() {
  return json({
    analytics: [{  // type of AnalyticsEvents
      eventName: 'ADD_TO_CART',
      payload: {
        variantId: '123'
      }
    }]
  })
}

type AnalyticsEvent = {
  eventName: string;
  payload?: {
    products?: string[],
    [string]: any
  }
}

type AnalyticsEvents = AnalyticsEvent[];
```

We can send custom events by invoking the `/events` endpoint.

```jsx
return (
  <Button onClick={() => {
    fetch('/events', {
      method: 'post',
      body: JSON.stringify([{  // type of AnalyticsEvents
        eventName: 'PROMO_LIST_CLICK',
        payload: {
          products: ['abc'],  // List of product handles to fetch for
          promoName: 'Recently Viewed',
          index: '2',
        }
      }])
    })
  }}>
    <p>Product Name</p>
  </Button>
)
```

# Collecting events on the client side

In root, we will just have an analytics component that will listen to all loaders and fetchers
and look for an `analytics` data.

```jsx
// root.tsx

export default function App() {
  return (
    <html>
      ...
      <Analytics />
      </body>
    </html>
  );
 }
```

The `Analytics` component is a collector of analytics event from loaders and fetchers
and makes the event fetch for the complete analytics data.

```jsx
export const Analytics() {
  const dataLoaders = useMatches();
  const fetchers = useFetchers();

  // Gather all data that have a `analytics` payload
  const events = [
    // merge of events to fire
    'PAGE_VIEW',
    'PRODUCT_VIEW'
  ];

  // Fire to server endpoint - most likely put this in a convenient function
  const data = fetch('/events', {
    method: 'post',
    body: JSON.stringify(events)
  })

  // Fire to client side analytics frameworks (or pass to a function callback)
  window.dataLayer.push(data.gtm)
}
```

# Server side events.tsx route

The `routes/events.tsx` collect the analytics request. The goal of this route:

* Query for the additional analytics data for the requested analytics event
* Format the data to the analytics framework specification (H2 will provide an interface for developers
  to specify the gql fragment and error message handling for analytics framework for missing data)

We can do a lot of things at the server side. Since the events endpoint is also same-origin, we have
access to everything:

* Buyer ip, user agent are available in the request header - we can add more common ones like referrer
  from the fetch event
* Based on request headers, we can determine the buyer consent status (Oxygen only) and provide the proper data
  privacy requirements (For other platforms, most likely needs a wrapper that fetches for the consent api)
* If customer access token is available in the session, we can grab the necessary customer information without
  needing to store values on the client side's cookie/local storages
* Analytic framework developers can provide plugins to shape Shopify data to their requirements (Developers can
  write their own as well if the default doesn't work for them)

```jsx
export const action = async ({request, context, params}) => {
  // Most likely can determine the url template type with routing manifest as well

  // Make query to SFAPI for the required data
  // These data can be cache for a very long time (default to max-age: 12 hrs swr: 12 hrs)
  //
  // We can make intelligent data fetches like
  // * Cache each product query results individually so it can be easily reused by other event requests
  const data = queryForAnalyticsData(request, context, {...options})

  // Send to Shopify analytics or any analytics frameworks that supports server side analytics
  shapeForShopifyAnalytics(data);

  return json({
    gtm: shapeForGTMAnalytics(data),  // Format data to the analytics framework requirement
    fb: shapeForFBAnalytics(data)
  })
}
```

`queryForAnalyticsData` will be a function provided by H2. It will:

* Ensure request is same-origin
* Make queries to SFAPI for analytics specific data
* Do intelligent caching like cache each product query results individually so it can be easily
  reused by other event requests
* Provides result in an expected shape for shaper functions (ie. `shapeForShopifyAnalytics`) to process

H2 will also provide error logging interface for analytics errors such that:

* Base on user option, logs nothing in production but logs loudly in development
* Provide standardized way to provide meaningful error messages that developers would know
  where to look for more information
