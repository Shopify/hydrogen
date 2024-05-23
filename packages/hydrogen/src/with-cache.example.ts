// In your app's `server.ts` file:
import * as remixBuild from '@remix-run/dev/server-build';
import {createWithCache, CacheLong} from '@shopify/hydrogen';
// Use another `createRequestHandler` if deploying off oxygen
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(
    request: Request,
    _env: Record<string, string>,
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
      return withCache(['my-cms', query], CacheLong(), async () => {
        return await (
          await fetch('my-cms.com/api', {
            method: 'POST',
            body: query,
          })
        ).json();
      });
    };

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        // Make sure to update remix.env.d.ts to include `fetchMyCMS`
        fetchMyCMS,
      }),
    });

    return handleRequest(request);
  },
};
