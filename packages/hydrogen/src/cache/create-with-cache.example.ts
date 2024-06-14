// In your app's `server.ts` file:
import * as remixBuild from '@remix-run/dev/server-build';
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

    // Create a custom utility to query a third-party API:
    const fetchMyCMS = (query: string) => {
      // Prefix the cache key and make it unique based on arguments.
      return withCache(['my-cms', query], CacheLong(), async (params) => {
        const response = await fetch('my-cms.com/api', {
          method: 'POST',
          body: query,
        });

        // Throw if the response is unsuccessful
        if (!response.ok) throw new Error(response.statusText);

        const {data, error} = (await response.json()) as {
          data: unknown;
          error?: string;
        };

        // Validate data and throw to avoid caching errors.
        if (error || !data) throw new Error(error ?? 'Missing data');

        // Optionally, add extra information to show
        // in the Subrequest Profiler utility.
        params.addDebugData({displayName: 'My CMS query', response});

        return data;
      });
    };

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        // Make sure to update env.d.ts to
        // include `fetchMyCMS` in `AppLoadContext`.
        fetchMyCMS,
      }),
    });

    return handleRequest(request);
  },
};
