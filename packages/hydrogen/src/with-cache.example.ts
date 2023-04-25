// In your app's `server.ts` file:
import * as remixBuild from '@remix-run/dev/server-build';
import {createWithCache_unstable, CacheLong} from '@shopify/hydrogen';
// Use another `createRequestHandler` if deploying off oxygen
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    /* ... */

    const cache = await caches.open('my-cms');
    const withCache = createWithCache_unstable({cache, waitUntil});

    // Create custom utilities to query third-party APIs:
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
        /* ... */
        fetchMyCMS,
      }),
    });

    /* ... */
  },
};
