# Third-party API queries and caching in Hydrogen

This recipe integrates third-party GraphQL APIs into your Hydrogen storefront 
with Oxygen's powerful sub-request caching system. Using the Rick & Morty API as an example, 
you'll learn how to:

1. **Create a cached GraphQL client** - Build a reusable client factory that minifies queries, 
   handles error handling, and integrates with Oxygen's caching infrastructure.

2. **Integrate with Hydrogen's context** - Add the third-party client to the global context 
   system, making it available in all routes and actions throughout your application.

3. **Query external APIs efficiently** - Fetch data from third-party sources in parallel 
   with Shopify API calls, leveraging Oxygen's caching to minimize latency and API calls.

## Use cases

This pattern is perfect for integrating:
- **CMS platforms** (Contentful, Sanity, Strapi)
- **Review systems** (Yotpo, Judge.me, Reviews.io)
- **Analytics services** (custom dashboards, reporting APIs)
- **Custom backend APIs** (inventory systems, ERP integrations)
- **Marketing tools** (email platforms, loyalty programs)

## Performance benefits

- **Sub-request caching**: Responses are cached at the edge, reducing API calls
- **Parallel data fetching**: Load third-party and Shopify data simultaneously
- **Configurable cache strategies**: Use CacheShort(), CacheLong(), or custom TTLs
- **Automatic cache key generation**: Based on query and variables

## Key features

- Caching strategies can be customized per query using Hydrogen's cache utilities (CacheShort, CacheLong, CacheNone)
- The client is added to the global context, making it available in all routes
- TypeScript types are automatically augmented for full IDE support
- Error handling is built-in with graceful fallbacks

> [!NOTE]
> The examples in this recipe use rickandmortyapi.com for demonstration purposes, but the patterns work with any GraphQL or REST API.

## Requirements

- Basic knowledge of GraphQL
- Understanding of Hydrogen's context system
- Familiarity with TypeScript (for type augmentation)

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/lib/createRickAndMortyClient.server.ts](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/third-party-api/ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server.ts) | A GraphQL client factory for third-party APIs with Oxygen caching support |

## Steps

### Step 1: Document third-party API integration

Add documentation explaining how to integrate external GraphQL APIs with Oxygen caching.

#### File: [README.md](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/templates/skeleton/README.md)

<details>

~~~diff
index c584e537..4c8dcead 100644
--- a/templates/skeleton/README.md
+++ b/templates/skeleton/README.md
@@ -1,6 +1,6 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Skeleton with Third-party API Integration
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+Hydrogen is Shopify's stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify's full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen, plus an example of integrating third-party GraphQL APIs with Oxygen caching.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -40,6 +40,46 @@ npm run build
 npm run dev
 ```
 
+## Third-party API Integration
+
+This example demonstrates how to query third-party GraphQL APIs with Oxygen's sub-request caching. The example uses the public [Rick & Morty API](https://rickandmortyapi.com/documentation/#graphql) to show how to:
+
+1. Create a cached GraphQL client for third-party APIs
+2. Integrate the client into Hydrogen's context  
+3. Query and display data from external APIs alongside Shopify data
+
+### Key files for third-party API integration
+
+| File | Description |
+| --- | --- |
+| [`app/lib/createRickAndMortyClient.server.ts`](app/lib/createRickAndMortyClient.server.ts) | GraphQL client factory with Oxygen caching support |
+| [`app/lib/context.ts`](app/lib/context.ts) | Modified to include the third-party client in Hydrogen context |
+| [`app/routes/_index.tsx`](app/routes/_index.tsx) | Homepage demonstrating parallel queries to both Shopify and third-party APIs |
+
+### How it works
+
+The Rick & Morty client is created in the context and made available to all routes:
+
+```ts
+// In app/lib/context.ts
+const rickAndMorty = createRickAndMortyClient({
+  cache,
+  waitUntil,
+  request,
+});
+```
+
+Then you can query the third-party API in any route:
+
+```ts
+// In any route loader
+const {characters} = await context.rickAndMorty.query(CHARACTERS_QUERY, {
+  cache: CacheShort(),
+});
+```
+
+This pattern can be adapted for any third-party API integration including CMS systems, review platforms, analytics services, or custom backend APIs.
+
 ## Setup for using Customer Account API (`/account` section)
 
 Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
~~~

</details>

### Step 2: Create the third-party API client

Create a new GraphQL client factory that integrates with Oxygen's caching system.
This client handles query minification, error handling, and cache key generation.

#### File: [createRickAndMortyClient.server.ts](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/third-party-api/ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server.ts)

<details>

~~~ts
import {
  createWithCache,
  CacheLong,
  type CachingStrategy,
} from '@shopify/hydrogen';

export function createRickAndMortyClient({
  cache,
  waitUntil,
  request,
}: {
  cache: Cache;
  waitUntil: ExecutionContext['waitUntil'];
  request: Request;
}) {
  const withCache = createWithCache({cache, waitUntil, request});

  return {
    async query<T = any>(
      query: `#graphql:rickAndMorty${string}`,
      options: {
        variables?: object;
        cache?: CachingStrategy;
      },
    ) {
      query = minifyQuery(query);
      const body = JSON.stringify({query, variables: options.variables});

      const {data, response} = await withCache.fetch<{data: T; error: string}>(
        'https://rickandmortyapi.com/graphql',
        {
          method: 'POST',
          headers: {'Content-type': 'application/json'},
          body,
        },
        {
          cacheStrategy: options.cache ?? CacheLong(),
          shouldCacheResponse: (body) => !body?.error,
          cacheKey: ['r&m', body],
          displayName:
            'Rick & Morty - ' + query.match(/^(query|mutation)\s\w+/)?.[0],
        },
      );

      if (!response.ok || !data || data?.error) {
        throw new Error(
          data?.error ??
            `Error fetching from rick and morty api: ${response.statusText}`,
        );
      }

      return data.data;
    },
  };
}

function minifyQuery<T extends string>(string: T) {
  return string
    .replace(/\s*#.*$/gm, '') // Remove GQL comments
    .replace(/\s+/gm, ' ') // Minify spaces
    .trim() as T;
}
~~~

</details>

### Step 3: Add the client to Hydrogen context

Import the Rick and Morty client and add it to the Hydrogen context so it's available
in all routes. Also update TypeScript declarations for proper type support.

#### File: [app/lib/context.ts](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/templates/skeleton/app/lib/context.ts)

<details>

~~~diff
index 692d5ae1..0635384a 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,25 +1,10 @@
 import {createHydrogenContext} from '@shopify/hydrogen';
 import {AppSession} from '~/lib/session';
 import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
-
-// Define the additional context object
-const additionalContext = {
-  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
-  // These will be available as both context.propertyName and context.get(propertyContext)
-  // Example of complex objects that could be added:
-  // cms: await createCMSClient(env),
-  // reviews: await createReviewsClient(env),
-} as const;
-
-// Automatically augment HydrogenAdditionalContext with the additional context type
-type AdditionalContextType = typeof additionalContext;
-
-declare global {
-  interface HydrogenAdditionalContext extends AdditionalContextType {}
-}
+import {createRickAndMortyClient} from '~/lib/createRickAndMortyClient.server';
 
 /**
- * Creates Hydrogen context for React Router 7.9.x
+ * Creates Hydrogen context for React Router 7.9.x with third-party API support
  * Returns HydrogenRouterContextProvider with hybrid access patterns
  * */
 export async function createHydrogenRouterContext(
@@ -40,6 +25,19 @@ export async function createHydrogenRouterContext(
     AppSession.init(request, [env.SESSION_SECRET]),
   ]);
 
+  // @description Create a Rick and Morty client for third-party GraphQL queries with Oxygen caching
+  const rickAndMorty = createRickAndMortyClient({
+    cache,
+    waitUntil,
+    request,
+  });
+
+  // @description Define the additional context object with the third-party client
+  const additionalContext = {
+    // Pass the Rick and Morty client to the action and loader context
+    rickAndMorty,
+  } as const;
+
   const hydrogenContext = createHydrogenContext(
     {
       env,
@@ -58,3 +56,12 @@ export async function createHydrogenRouterContext(
 
   return hydrogenContext;
 }
+
+// @description Augment HydrogenAdditionalContext with third-party client type
+type AdditionalContextType = {
+  rickAndMorty: ReturnType<typeof createRickAndMortyClient>;
+};
+
+declare global {
+  interface HydrogenAdditionalContext extends AdditionalContextType {}
+}
\ No newline at end of file
~~~

</details>

### Step 4: Query and display third-party data

Update the homepage to fetch data from the third-party API and display it alongside
Shopify data. This demonstrates parallel data fetching and proper caching strategies.

#### File: [app/routes/_index.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/templates/skeleton/app/routes/_index.tsx)

<details>

~~~diff
index 28102dbe..618b99a0 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,11 +1,7 @@
-import {
-  Await,
-  useLoaderData,
-  Link,
-} from 'react-router';
+import {Await, useLoaderData, Link} from 'react-router';
 import type {Route} from './+types/_index';
 import {Suspense} from 'react';
-import {Image} from '@shopify/hydrogen';
+import {Image, CacheShort} from '@shopify/hydrogen';
 import type {
   FeaturedCollectionFragment,
   RecommendedProductsQuery,
@@ -31,13 +27,19 @@ export async function loader(args: Route.LoaderArgs) {
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
 async function loadCriticalData({context}: Route.LoaderArgs) {
-  const [{collections}] = await Promise.all([
+  // @description Fetch Rick & Morty characters using the third-party GraphQL API with caching
+  const [{collections}, {characters}] = await Promise.all([
     context.storefront.query(FEATURED_COLLECTION_QUERY),
-    // Add other queries here, so that they are loaded in parallel
+    // @description Query third-party Rick & Morty API with Oxygen caching
+    context.rickAndMorty.query(CHARACTERS_QUERY, {
+      cache: CacheShort(),
+    }),
   ]);
 
   return {
     featuredCollection: collections.nodes[0],
+    // @description Return Rick & Morty characters data
+    characters,
   };
 }
 
@@ -64,12 +66,50 @@ export default function Homepage() {
   const data = useLoaderData<typeof loader>();
   return (
     <div className="home">
+      {/* @description Display Rick & Morty characters from third-party API */}
+      <ThirdPartyApiExample characters={data.characters} />
       <FeaturedCollection collection={data.featuredCollection} />
       <RecommendedProducts products={data.recommendedProducts} />
     </div>
   );
 }
 
+// @description Component to display Rick & Morty characters fetched from third-party API
+function ThirdPartyApiExample({characters}: {characters: any}) {
+  return (
+    <section className="third-party-api-example">
+      <h2>Rick & Morty Characters (Third-Party API Example)</h2>
+      <p>
+        This data is fetched from rickandmortyapi.com GraphQL API with Oxygen
+        caching:
+      </p>
+      <br />
+      <ul
+        style={{
+          listStyle: 'none',
+          display: 'flex',
+          flexDirection: 'column',
+          gap: '1rem',
+          flexWrap: 'wrap',
+        }}
+      >
+        {characters?.results?.map((character: any) => (
+          <li
+            key={character.id}
+            style={{
+              padding: '0.5rem',
+              border: '1px solid #ccc',
+              borderRadius: '4px',
+            }}
+          >
+            {character.name}
+          </li>
+        ))}
+      </ul>
+    </section>
+  );
+}
+
 function FeaturedCollection({
   collection,
 }: {
@@ -141,6 +181,18 @@ const FEATURED_COLLECTION_QUERY = `#graphql
   }
 ` as const;
 
+// @description GraphQL query for Rick & Morty characters from third-party API
+const CHARACTERS_QUERY = `#graphql:rickAndMorty
+  query Characters {
+    characters(page: 1) {
+      results {
+        name
+        id
+      }
+    }
+  }
+`;
+
 const RECOMMENDED_PRODUCTS_QUERY = `#graphql
   fragment RecommendedProduct on Product {
     id
~~~

</details>

## Next steps

After applying this recipe, you can:

1. **Customize the caching strategy** - Adjust cache durations based on your data freshness requirements:
   ```ts
   // Short cache for frequently changing data
   cache: CacheShort()
   
   // Long cache for stable data
   cache: CacheLong()
   
   // Custom cache duration
   cache: CacheCustom({
     mode: 'must-revalidate',
     maxAge: 60, // 1 minute
     staleWhileRevalidate: 60 * 5, // 5 minutes
   })
   ```

2. **Add more third-party APIs** - Create additional clients following the same pattern:
   - Copy `createRickAndMortyClient.server.ts` and adapt for your API
   - Add the new client to `context.ts`
   - Update TypeScript types in the global declaration

3. **Implement error handling** - Add try-catch blocks and fallback UI:
   ```ts
   try {
     const data = await context.yourApi.query(QUERY);
     return {data};
   } catch (error) {
     console.error('API Error:', error);
     return {data: null, error: error.message};
   }
   ```

4. **Monitor performance** - Use Oxygen's analytics to track:
   - Cache hit rates
   - API response times
   - Sub-request performance

5. **Replace the example** - Swap out the Rick & Morty API with your actual third-party service:
   - Update the API endpoint in the client
   - Modify queries to match your API schema
   - Update components to display your data