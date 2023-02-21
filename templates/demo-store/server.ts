// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {
  AdapterMiddlewareFunction,
  createRequestHandler,
} from '@shopify/remix-oxygen';
import {type Env, oxygenContext} from '~/context';

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      /**
       * Open a cache instance in the worker and a custom session instance.
       */
      if (!env?.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is not set');
      }

      const waitUntil = (p: Promise<any>) => executionContext.waitUntil(p);

      const adapterMiddleware: AdapterMiddlewareFunction = async ({
        context,
      }) => {
        // Set Oxygen-specific context which can be accessed in other middleware, loaders, and actions.
        context.set(oxygenContext, {
          waitUntil,
          cache: await caches.open('hydrogen'),
          env,
        });

        // Run the request through the app (and route middlewares)
        const fetchResponse = await context.next();

        return fetchResponse;
      };

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        adapterMiddleware,
      });

      return await handleRequest(request);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
