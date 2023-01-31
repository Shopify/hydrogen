# Fetching data in Hydrogen

Hydrogen provides utilities to send GraphQL queries and mutations to the Storefront API.

## Creating and injecting the storefront client

First of all, it's necessary to create and inject the Hydrogen `storefront` client into the loader context in Remix. In the server/worker entry file, call `createStorefrontClient` inside `getLoadContext`:

```ts
import {createStorefrontClient} from '@shopify/hydrogen';
import {createRequestHandler, getBuyerIp} from '@shopify/remix-oxygen';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const cache = await caches.open('hydrogen');

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext() {
        const {storefront} = createStorefrontClient({
          cache,
          waitUntil: (p: Promise) => executionContext.waitUntil(p),
          buyerIp: getBuyerIp(request),
          publicStorefrontToken: env.SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN,
          storefrontApiVersion: env.SHOPIFY_STOREFRONT_API_VERSION,
          storeDomain: env.SHOPIFY_STORE_DOMAIN,
        });

        return {storefront};
      },
    });

    return handleRequest(request);
  },
};
```

## Running queries

To load data into your Hydrogen app, use a Remix `loader` and write a GraphQL query. Hydrogen provides a special `storefront` param to make queries against your Shopify storefront.

```ts
import type {ProductType} from '@shopify/hydrogen/storefront-api-types';
import {json, useLoaderData, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params, context: {storefront}}: LoaderArgs) {
  const productQuery = storefront.query<ProductType>(
    `#graphql
      query Product($handle: String!) {
        product(handle: $handle) {
          id
          title
        }
      }
    `,
    {
      /**
       * Pass variables related to the query.
       */
      variables: {
        handle: params.handle,
      },
      /**
       * Cache your server-side query with a built-in best practice default (SWR).
       */
      cache: storefront.CacheShort(),
    },
  );

  return json({
    product: await productQuery,
  });
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // ...
}
```

Sometimes, you will want to prioritize critical data, like product information, while deferring comments or reviews.

```ts
import {defer, useLoaderData, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params, context: {storefront}}: LoaderArgs) {
  const productQuery = storefront.query(
    `#graphql
      query Product($handle: String!) {
        product(handle: $handle) {
          id
          title
        }
      }
    `,
    {
      variables: {
        handle: params.handle,
      },
    },
  );

  const reviewsQuery = storefront.query(
    `#graphql
      query ProductReviews($handle: String!) {
        productReviews(handle: $handle) {
          nodes {
            description
          }
        }
      }
    `,
    {
      variables: {
        handle: params.handle,
      },
    },
  );

  return defer({
    product: await productQuery,
    reviews: reviewsQuery,
  });
}

export default PageComponent() {
  const {product, reviews} = useLoaderData<typeof loader>();

  return (
    <div>
      <Product value={product} />
      <Suspense fallback={<Spinner />}>
        <Await resolve={reviews}>
          {({productReviews}) => <ProductReviews value={productReviews.nodes}>}
        </Await>
      </Suspense>
    </div>
  );
}
```

### Caching data

Data that is not updated often can be cached to speed up subsequent queries. Hydrogen supports caching at the sub-request level:

```tsx
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params, context: {storefront}}: LoaderArgs) {
  const productQuery = storefront.query(
    `#graphql
      query Product($handle: String!) {
        product(handle: $handle) {
          id
          title
        }
      }
    `,
    {
      variables: {
        handle: params.handle,
      },
      cache: storefront.CacheLong(),
    },
  );

  const reviewsQuery = storefront.query(
    `#graphql
      query ProductReviews($handle: String!) {
        productReviews(handle: $handle) {
          nodes {
            description
          }
        }
      }
    `,
    {
      variables: {
        handle: params.handle,
      },
      cache: storefront.CacheShort(),
    },
  );

  return defer({
    product: await productQuery,
    reviews: reviewsQuery,
  });
}
```

By default, Hydrogen adds the equivalent to `storefront.CacheShort()` to every query. Sometimes, when data can be mutated by the user in the same page, you may want to disable caching manually by passing `storefront.cacheNone()`. This will prevent serving stale data when Remix refreshes the loaders after a mutation.

## Mutating data

To mutate data in actions, use the `storefront.mutate` function. This is just like the `query` property, except caching is disabled:

```ts
export async function action({request, context: {storefront}}) {
  const formData = await request.formData();

  const cartMutation = storefront.mutate(
    `#graphql
      mutation lineItemUpdate($lineId: ID!, $input: CartLineUpdateInput!) {
          lineItemUpdate(lineId: $lineId, input: $input) {
            quantity
          }
      }
    `,
    {
      /**
       * Pass variables related to the query.
       */
      variables: {
        lineId: formData.get('lineId'),
        input: formData.get('input'),
      },
      /**
       * Mutations are NEVER cached by default.
       */
    },
  );

  return json({
    status: 'ok',
  });
}
```

## Injecting country and language directives into queries

The Storefront API accepts an [`@inContext` directive](https://shopify.dev/custom-storefronts/internationalization/international-pricing) to support international pricing. Whereas you can pass variables directly when calling `storefront.query`, it's also possible to inject the `language` and `country` variables automatically. To enable this feature, check how to use the `i18n` property when creating the Storefront client in the [i18n documentation](./i18n.md).
