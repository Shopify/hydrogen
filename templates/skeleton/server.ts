// Virtual entry point for the app
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from '@shopify/remix-oxygen';
import {createAppLoadContext} from '~/lib/context';

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    // Debug: return early to test if worker is running
    if (new URL(request.url).pathname === '/debug') {
      return new Response(
        JSON.stringify({
          status: 'Worker is running!',
          envKeys: Object.keys(env),
          hasSessionSecret: 'SESSION_SECRET' in env,
          sessionSecretValue: env.SESSION_SECRET ? 'set' : 'not set',
        }),
        {
          status: 200,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    try {
      let debugInfo = {step: 'start'};
      let appLoadContext;

      try {
        debugInfo.step = 'createAppLoadContext';
        appLoadContext = await createAppLoadContext(
          request,
          env,
          executionContext,
        );
        debugInfo.contextCreated = true;
      } catch (e) {
        return new Response(
          JSON.stringify({
            error: 'Failed to create app context',
            message: e instanceof Error ? e.message : 'Unknown error',
            debugInfo,
          }),
          {status: 500, headers: {'Content-Type': 'application/json'}},
        );
      }

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      let build;
      try {
        debugInfo.step = 'import virtual module';
        // @ts-expect-error Not a valid import.
        build = await import('virtual:react-router/server-build'); // eslint-disable-line import/no-unresolved
        debugInfo.moduleImported = true;
      } catch (importError) {
        return new Response(
          JSON.stringify({
            error: 'Failed to import virtual module',
            message:
              importError instanceof Error
                ? importError.message
                : 'Unknown error',
            debugInfo,
          }),
          {status: 500, headers: {'Content-Type': 'application/json'}},
        );
      }

      const handleRequest = createRequestHandler({
        build,
        mode: process.env.NODE_ENV || 'development',
        getLoadContext: () => appLoadContext,
      });

      const response = await handleRequest(request);

      if (appLoadContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await appLoadContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: appLoadContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      if (process.env.SHOPIFY_UNIT_TEST) {
        // Return detailed error in test mode
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return new Response(errorMessage, {status: 500});
      }
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
