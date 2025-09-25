# Overview

This prompt describes how to implement "Third-party API Queries and Caching" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Add third-party GraphQL API queries with Oxygen's sub-request caching to your Hydrogen storefront.

# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the third-party-api recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe demonstrates how to integrate third-party GraphQL APIs into your Hydrogen storefront 
with Oxygen's powerful sub-request caching system. Using the Rick & Morty API as an example, 
you'll learn how to:

1. **Create a cached GraphQL client** - Build a reusable client factory that handles query 
   minification, error handling, and integrates with Oxygen's caching infrastructure

2. **Integrate with Hydrogen's context** - Add the third-party client to the global context 
   system, making it available in all routes and actions throughout your application

3. **Query external APIs efficiently** - Fetch data from third-party sources in parallel 
   with Shopify API calls, leveraging Oxygen's caching to minimize latency and API calls

## Use Cases

This pattern is perfect for integrating:
- **CMS platforms** (Contentful, Sanity, Strapi)
- **Review systems** (Yotpo, Judge.me, Reviews.io)
- **Analytics services** (custom dashboards, reporting APIs)
- **Custom backend APIs** (inventory systems, ERP integrations)
- **Marketing tools** (email platforms, loyalty programs)

## Performance Benefits

- **Sub-request caching**: Responses are cached at the edge, reducing API calls
- **Parallel data fetching**: Load third-party and Shopify data simultaneously
- **Configurable cache strategies**: Use CacheShort(), CacheLong(), or custom TTLs
- **Automatic cache key generation**: Based on query and variables

## Notes

> [!NOTE]
> The example uses rickandmortyapi.com for demonstration, but the pattern works with any GraphQL or REST API

> [!NOTE]
> Caching strategies can be customized per query using Hydrogen's cache utilities (CacheShort, CacheLong, CacheNone)

> [!NOTE]
> The client is added to the global context, making it available in all routes

> [!NOTE]
> TypeScript types are automatically augmented for full IDE support

> [!NOTE]
> Error handling is built-in with graceful fallbacks

## Requirements

- Basic knowledge of GraphQL
- Understanding of Hydrogen's context system
- Familiarity with TypeScript (for type augmentation)

## New files added to the template by this recipe

- app/lib/createRickAndMortyClient.server.ts

## Steps

### Step 1: README.md



#### File: /README.md

```diff
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
```

### Step 1: Create the third-party API client

Create a new GraphQL client factory that integrates with Oxygen's caching system.
This client handles query minification, error handling, and cache key generation.

#### File: [createRickAndMortyClient.server.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/cookbook/recipes/third-party-api/ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server.ts)

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

### Step 2: Add the client to Hydrogen context

Import the Rick and Morty client and add it to the Hydrogen context so it's available
in all routes. Also update TypeScript declarations for proper type support.

#### File: /app/lib/context.ts

```diff
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

### Step 3: Query and display third-party data

Update the homepage to fetch data from the third-party API and display it alongside
Shopify data. This demonstrates parallel data fetching and proper caching strategies.

#### File: /app/routes/_index.tsx

```diff
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
```

</recipe_implementation>