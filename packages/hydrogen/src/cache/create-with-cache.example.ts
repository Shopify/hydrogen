// In your app's `server.ts` file:
import * as remixBuild from '@react-router/dev/server-build';
import {createWithCache, CacheLong} from '@shopify/hydrogen';
// Use another `createRequestHandler` if deploying off oxygen
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext,
  ) {
    const cache = await caches.open('my-cms');
    const withCache = createWithCache({
      cache,
      waitUntil: executionContext.waitUntil.bind(executionContext),
      request,
    });

    type ExpectedResponse = {
      content: unknown;
      isLoggedIn: boolean;
      errors?: string;
    };

    type MergedResponse = {
      content: unknown;
      isLoggedIn: boolean;
      errors?: string;
      extra1: string | null;
      extra2: string | null;
    };

    // 1. Create a custom utility to query a third-party API:
    const fetchMyCMS = async (query: string) => {
      const {data, response} = await withCache.fetch<ExpectedResponse>(
        'https://my-cms.com/api',
        {
          method: 'POST',
          body: query,
          headers: {Authorization: 'Bearer 123'},
        },
        {
          // Optionally, specify a cache strategy.
          // Default is CacheShort().
          cacheStrategy: CacheLong(),
          // Cache if there are no data errors or a specific data that make this result not suited for caching
          shouldCacheResponse: (result) =>
            !(result?.errors || result?.isLoggedIn),
          // Optionally, add extra information to show
          // in the Subrequest Profiler utility.
          displayName: 'My CMS query',
        },
      );

      // Access the response properties:
      console.log(data, response.headers);

      return data;
    };

    // 2. Or Create a more advanced utility to query multiple APIs under the same cache key:
    const fetchMultipleCMS = (options: {id: string; handle: string}) => {
      // Prefix the cache key and make it unique based on arguments.
      return withCache.run(
        {
          // Define a cache key that is unique to this query
          cacheKey: ['my-cms-composite', options.id, options.handle],
          // Optionally, specify a cache strategy.
          // Default is CacheShort().
          cacheStrategy: CacheLong(),
          // Cache if there are no data errors or a specific data that make this result not suited for caching
          shouldCacheResult: (result: MergedResponse) =>
            !(result?.errors || result?.isLoggedIn),
        },
        async (params) => {
          // Run multiple subrequests in parallel, or any other async operations.
          const [response1, response2] = await Promise.all([
            fetch('https://my-cms-1.com/api', {
              method: 'POST',
              body: JSON.stringify({id: options.id}),
            }),
            fetch('https://my-cms-2.com/api', {
              method: 'POST',
              body: JSON.stringify({handle: options.handle}),
            }),
          ]);

          // Throw if any response is unsuccessful.
          // This is important to prevent the results from being cached.
          if (!response1.ok || !response2.ok) {
            throw new Error('Failed to fetch data');
          }

          const [data1, data2] = (await Promise.all([
            response1.json(),
            response2.json(),
          ])) as [ExpectedResponse, ExpectedResponse];

          // Validate data and throw to avoid caching errors.
          if (data1.errors || data2.errors) {
            throw new Error('API errors');
          }

          // Optionally, add extra information to show
          // in the Subrequest Profiler utility.
          params.addDebugData({displayName: 'My CMS query'});

          // Compose the result as needed.
          return {
            ...data1,
            ...data2,
            extra1: response1.headers.get('X-Extra'),
            extra2: response2.headers.get('X-Extra'),
          } as MergedResponse;
        },
      );
    };

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        // Make sure to update env.d.ts to
        // include these properties in `AppLoadContext`.
        fetchMyCMS,
        fetchMultipleCMS,
      }),
    });

    return handleRequest(request);
  },
};
