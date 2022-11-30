# Fetching data in Hydrogen

## Running queries

To load data into your Hydrogen app, use a Remix `loader` and write a GraphQL query. Hydrogen provides a special `storefront` param to make queries against your Shopify storefront.

```ts
import type {ProductType} from '@shopify/hydrogen-react/storefront-api-types';
import {json, useLoaderData, type LoaderArgs} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';

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
       * Optionally filter your data before it is returned from the loader.
       */
      filter(data, errors) {
        invariant(data.product, 'No product found');

        return data.product;
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
import {defer, type LoaderArgs} from '@shopify/hydrogen-remix';

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
      filter(data, errors) {
        invariant(data.productReviews, 'No product found');

        return data.productReviews;
      },
    },
  );

  return defer({
    product: await productQuery,
    reviews: reviewsQuery,
  });
}
```

### Caching data

Data that is not updated often can be cached to speed up subsequent queries. Hydrogen supports caching at the sub-request level:

```ts
import {defer, type LoaderArgs} from '@shopify/hydrogen-remix';

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
      cache: storefront.CacheShort(),
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

  return defer(
    {
      product: await productQuery,
      reviews: reviewsQuery,
    },
    {
      // TODO: Do we want full-page cache?
      // See implications on caching errored defer data, etc
      headers: {
        'Cache-Control': 'max-age=1; stale-while-revalidate=9',
      },
    },
  );
}
```

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

## Calling third-party APIs

Hydrogen implements clever cache strategies for querying the Storefront API. However, the same feature can be used for third-party APIs by using `context.fetch` instead of the global `fetch`:

```ts
export async function loader({
  params,
  context: {fetch, storefront},
}: LoaderArgs) {
  const [body, response] = await fetch('https://third-party-api.com/resource', {
    method: 'GET',
    headers: {
      /*...*/
    },
    hydrogen: {
      /**
       * Cache your third-party API request in the server.
       */
      cache: storefront.CacheLong(),
      /**
       * [Optional] Check the response body to optionally avoid caching. Useful for GraphQL logical errors.
       */
      shouldCacheResponse: (body) => !body.errors,
    },
  });
}
```
