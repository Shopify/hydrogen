# @shopify/hydrogen-analytics

Framework-agnostic analytics event bus for Shopify storefronts. Works with Hydrogen, Next.js, or any JavaScript framework.

## Install

```bash
npm install @shopify/hydrogen-analytics
```

## Quick Start

```typescript
import {createAnalyticsBus, AnalyticsEvent} from '@shopify/hydrogen-analytics';
import type {ShopAnalytics, ConsentConfig} from '@shopify/hydrogen-analytics';

// 1. Resolve your shop data however you want (GraphQL, env vars, CMS, etc.)
const shop: ShopAnalytics = {
  shopId: 'gid://shopify/Shop/123456',
  acceptedLanguage: 'EN',
  currency: 'USD',
  hydrogenSubchannelId: '0',
};

// 2. Configure consent
const consent: ConsentConfig = {
  checkoutDomain: 'your-store.myshopify.com',
  storefrontAccessToken: 'your-public-storefront-token',
  withPrivacyBanner: true,
  country: 'US',
  language: 'EN',
};

// 3. Create the bus
const bus = createAnalyticsBus({shop, consent});

// 4. Subscribe to events
const unsubscribe = bus.subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
  console.log('Page viewed:', payload.url);
});

// 5. Publish events
bus.publish(AnalyticsEvent.PAGE_VIEWED, {
  url: window.location.href,
  shop,
});

// 6. Cleanup when done
unsubscribe();
bus.destroy();
```

## Core Concepts

### The Bus

`createAnalyticsBus()` creates an isolated pub/sub instance that handles:

- **Event routing** — publish/subscribe for analytics events
- **Consent management** — intercepts Shopify's consent SDK to inject headless storefront configuration
- **Cart tracking** — automatic diff detection via `updateCart()` that emits `product_added_to_cart` / `product_removed_from_cart` events
- **Analytics dispatch** — sends page view and e-commerce events to Shopify's analytics pipeline
- **Web vitals** — performance reporting after consent is collected

### Shop Data

The bus requires a `ShopAnalytics` object — four flat strings describing your store:

```typescript
type ShopAnalytics = {
  shopId: string; // e.g. "gid://shopify/Shop/123456"
  acceptedLanguage: string; // e.g. "EN"
  currency: string; // e.g. "USD"
  hydrogenSubchannelId: string | '0';
};
```

You resolve this data yourself from whatever source makes sense for your framework. A typical approach is a GraphQL query against the Storefront API:

```graphql
query ShopData($country: CountryCode, $language: LanguageCode)
@inContext(country: $country, language: $language) {
  shop {
    id
  }
  localization {
    country {
      currency {
        isoCode
      }
    }
    language {
      isoCode
    }
  }
}
```

### Events

| Event               | Payload                 | When to publish                          |
| ------------------- | ----------------------- | ---------------------------------------- |
| `page_viewed`       | `PageViewPayload`       | Route change / page navigation           |
| `product_viewed`    | `ProductViewPayload`    | Product detail page rendered             |
| `collection_viewed` | `CollectionViewPayload` | Collection page rendered                 |
| `cart_viewed`       | `CartViewPayload`       | Cart page or drawer opened               |
| `search_viewed`     | `SearchViewPayload`     | Search results rendered                  |
| `custom_*`          | `CustomEventPayload`    | Any custom event (prefix with `custom_`) |

Cart events (`cart_updated`, `product_added_to_cart`, `product_removed_from_cart`) are emitted automatically when you call `bus.updateCart()` with new cart data — you don't publish these yourself.

### Cart Tracking

Pass your cart object to `updateCart()` whenever the cart changes. The bus diffs against the previous cart and automatically publishes granular line-item events:

```typescript
bus.updateCart(cart); // detects added/removed/updated lines
```

Cart lines must include `id`, `quantity`, and `merchandise` with `id`, `title`, `price`, and `product` fields. See the `AnalyticsCartLine` type for the full shape.

## Framework Integration

This package is the engine. Framework-specific wrappers bridge lifecycle events to the bus.
