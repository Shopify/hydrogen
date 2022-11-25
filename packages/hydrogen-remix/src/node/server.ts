import {type CreateRequestHandlerOptions} from '@remix-run/oxygen';
import {createRequestHandler as createExpressRequestHandler} from '@remix-run/express';
import {InMemoryCache} from '@shopify/hydrogen';
import {
  createHydrogenContext,
  logResponse,
  type RequestHandlerOptions,
} from '../server';

export function createRequestHandler({
  build,
  mode,
  getLoadContext,
}: CreateRequestHandlerOptions) {
  return async (
    request: Request,
    options: RequestHandlerOptions,
    customContext?: Record<string, any>,
  ) => {
    if (!options.cache) {
      options.cache = new InMemoryCache();
    }

    const handleRequest = createExpressRequestHandler({
      build,
      getLoadContext: (request, response) => ({
        ...createHydrogenContext(request, options, customContext),
        ...(getLoadContext?.(request, response) ?? {}),
      }),
      mode,
    });

    const {
      context: {response, next},
    } = options;

    try {
      await handleRequest(request, response, next);
      logResponse(mode!, request, response.statusCode);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(500).send('Internal Error');
    }
  };
}
