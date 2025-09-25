# Third-party API Queries and Caching

This recipe demonstrates how to query third-party GraphQL APIs with Oxygen caching in Hydrogen. 
The example uses the public Rick & Morty API to show how to:

1. Create a cached GraphQL client for third-party APIs
2. Integrate the client into Hydrogen's context
3. Query and display data from external APIs alongside Shopify data

This pattern can be adapted for any third-party API integration including CMS systems, 
review platforms, analytics services, or custom backend APIs.

> [!NOTE]
> The example uses rickandmortyapi.com for demonstration, but the pattern works with any GraphQL API

> [!NOTE]
> Caching strategies can be customized per query using Hydrogen's cache utilities

> [!NOTE]
> The client is added to the global context, making it available in all routes

## Requirements

Basic knowledge of GraphQL and understanding of Hydrogen's caching system.

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/lib/createRickAndMortyClient.server.ts](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/cookbook/recipes/third-party-api/ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server.ts) | A GraphQL client factory for third-party APIs with Oxygen caching support |

## Steps

### Step 1: Create the third-party API client

Create a new GraphQL client factory that integrates with Oxygen's caching system.
This client handles query minification, error handling, and cache key generation.

#### File: [createRickAndMortyClient.server.ts](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/cookbook/recipes/third-party-api/ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server.ts)

<details>

```ts
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
```

</details>

### Step 2: Add the client to Hydrogen context

Import the Rick and Morty client and add it to the Hydrogen context so it's available
in all routes. Also update TypeScript declarations for proper type support.

#### File: [app/lib/context.ts](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/app/lib/context.ts)

<details>

```diff
index 3989ec05e..22e48fc8e 100644
--- a/templates/skeleton/app/lib/context.ts
+++ b/templates/skeleton/app/lib/context.ts
@@ -1,25 +1,11 @@
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
+// @description Import the Rick and Morty client for third-party GraphQL queries
+import {createRickAndMortyClient} from '~/lib/createRickAndMortyClient.server';
 
 /**
- * Creates Hydrogen context for React Router 7.8.x
+ * Creates Hydrogen context for React Router 7.8.x with third-party API support
  * Returns HydrogenRouterContextProvider with hybrid access patterns
  * */
 export async function createHydrogenRouterContext(
@@ -40,6 +26,19 @@ export async function createHydrogenRouterContext(
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
@@ -58,3 +57,12 @@ export async function createHydrogenRouterContext(
 
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
```

</details>

### Step 3: Query and display third-party data

Update the homepage to fetch data from the third-party API and display it alongside
Shopify data. This demonstrates parallel data fetching and proper caching strategies.

#### File: [app/routes/_index.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 28102dbe6..b72d3531d 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -5,7 +5,7 @@ import {
 } from 'react-router';
 import type {Route} from './+types/_index';
 import {Suspense} from 'react';
-import {Image} from '@shopify/hydrogen';
+import {Image, CacheShort} from '@shopify/hydrogen';
 import type {
   FeaturedCollectionFragment,
   RecommendedProductsQuery,
@@ -31,13 +31,19 @@ export async function loader(args: Route.LoaderArgs) {
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
 
@@ -64,12 +70,31 @@ export default function Homepage() {
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
+      <p>This data is fetched from rickandmortyapi.com GraphQL API with Oxygen caching:</p>
+      <ul style={{listStyle: 'none', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
+        {characters?.results?.map((character: any) => (
+          <li key={character.id} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}>
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
@@ -141,6 +166,18 @@ const FEATURED_COLLECTION_QUERY = `#graphql
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
```

</details>