// This file is stringified, do not import anything here.

type Service = {fetch: typeof fetch};

export type MiniOxygenHandlerEnv = {
  entry: Service;
  assets?: Service;
  hook?: Service;
  staticAssetExtensions?: string[];
  oxygenHeadersMap: Record<string, string>;
};

export function getMiniOxygenHandlerScript() {
  return `export default { fetch: ${miniOxygenHandler} }\n${withRequestHook}`;
}

async function miniOxygenHandler(
  request: Request,
  env: MiniOxygenHandlerEnv,
  context: ExecutionContext,
) {
  const {pathname} = new URL(request.url);

  if (env.assets && env.staticAssetExtensions && request.method === 'GET') {
    const staticAssetExtensions = new Set(env.staticAssetExtensions);
    const wellKnown = pathname.startsWith('/.well-known');
    const extension = pathname.split('.').at(-1) ?? '';
    const isAsset =
      wellKnown || !!staticAssetExtensions.has(extension.toUpperCase());

    if (isAsset) {
      const response = await env.assets.fetch(
        new Request(request.url, {
          signal: request.signal,
          headers: request.headers,
        }),
      );

      if (response.status !== 404) return response;
    }
  }

  const requestInit = {
    headers: {
      'request-id': crypto.randomUUID(),
      ...env.oxygenHeadersMap,
      ...Object.fromEntries(request.headers.entries()),
    },
  } satisfies RequestInit;

  const handleRequest = () => env.entry.fetch(request, requestInit);

  return env.hook
    ? withRequestHook({
        ...requestInit,
        handleRequest,
        request,
        headers: requestInit.headers,
        hook: env.hook,
        context,
      })
    : handleRequest();
}

type RequestHookOptions = {
  handleRequest: () => Response | Promise<Response>;
  request: Request;
  headers?: Record<string, string>;
  context: ExecutionContext;
  hook: Service;
};

export async function withRequestHook({
  handleRequest,
  request,
  headers,
  hook,
  context,
}: RequestHookOptions) {
  const startTimeMs = Date.now();
  const response = await handleRequest();
  const durationMs = Date.now() - startTimeMs;

  context.waitUntil(
    hook.fetch(request.url, {
      method: request.method,
      signal: request.signal,
      headers: {
        ...headers,
        'o2-duration-ms': String(durationMs),
        'o2-response-status': String(response.status),
      },
    }),
  );

  return response;
}

export function getRequestInfo(headers: {get(name: string): string | null}) {
  return {
    durationMs: Number(headers.get('o2-duration-ms') || 0),
    responseStatus: Number(headers.get('o2-response-status') || 200),
  };
}
