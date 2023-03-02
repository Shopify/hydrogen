import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

/**
 * Returns a request handler for the Oxygen runtime that serves the
 * Remix SSR response.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (request: Request) => {
    return handleRequest(
      request,
      (await getLoadContext?.(request)) as AppLoadContext,
    );
  };
}

/**
 * Extracts the buyer IP address (browser client) from the current request in Oxygen
 * to avoid API rate limits.
 */
export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}

/**
 * Extracts the group ID from the current request in Oxygen to improve logs.
 */
export function getRequestGroupId(request: Request) {
  return request.headers.get('request-id') ?? undefined;
}
