import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

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

export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}
