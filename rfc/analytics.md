# Analytics on Hydrogen Remix

_Date: Nov 7, 2022_

---

One of the biggest problems that we see with analytics in general is the constant movement 
of data moving from server side to client side and then back to server side. The same set of
data is manipulated multiple times and per client per analytic framework. Sometimes, we query
even more data so that we meet the analytics requirements of multiple analytics framework and
these data will never seen by the visitors.

With Remix, we want to rethink how this all works to acheieve the following:

1. Reduce the amount of data travelling over the network
2. Reduce the code needed, on the client side, to manipulate data for analytics

# Back to the basic - What if we can have analytics without javascript?

Challenage accepted - Without javascript, we can only acheive analytics tracking with either
image pixels or iframe with a bunch of search parameters wrapped in a `<noscript>`

```html
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-123456" height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

There limitation with this approach on

* The amount of data you can pass with a url
* Only select few client information can be passed cross domain

# Instrumenting event on client side

All we really from the client side are the critial information required to make additional SFAPI calls
for the analytics data we need. For example, for product page view, we just need the product handle
and we can query for the analytics data.

But hold on, aren't we making 2 query calls per page in this case?

Yes, we are but we can cache this set of data for a very long time. There are no time dependency for it.
We can attaching the eventing mechanism to loaders and actions.

```jsx
// routes/products/$productHandle.jsx

export const loader() {
  return json({
    analytics: {
      eventName: 'PRODUCT_VIEW'
    }
  })
}

export const action() {
  return json({
    analytics: {
      eventName: 'ADD_TO_CART',
      payload: {
        variantId: '123'
      }
    }
  })
}
```

# Collecting events on the client side

In root, we will just have an analytics component that will listen to all loaders and fetchers
and look for an `analytics` data. It will make the 

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
  const payloads = {
    // merge of payloads
    productHandle: '123'
  }
  
  // Fire to server endpoint
  const data = fetch('/event.js'); // POST event with data
  
  // Fire to client side analytics frameworks (or pass to a function callback)
  window.dataLayer.push(data.gtm)
}
```

# Server side events.tsx route

The `routes/events.tsx` collect the analytics request

```jsx
export const action = () => {
  // Get request data - client headers and POST data
  
  // Make query to SFAPI for the required data
  // These data can be cache for a very long time
  const data = Storefront.query(...)
  
  // Send to Shopify analytics or any analytics frameworks that supports server side analytics
  
  return json({
    gtm: ['pageview'],  // Format data to the analytics framework requirement
  })
}
```

We most likely can make use of the routing manifest to determine page template type here as well.
