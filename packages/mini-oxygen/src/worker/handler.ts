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

// This function is stringified, do not use anything from outer scope here:
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

/**
 * @public
 */
export type RequestHookInfo = {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  meta: {
    startTimeMs: number;
    endTimeMs: number;
    durationMs: number;
  };
};

// This function is stringified, do not use anything from outer scope here:
export async function withRequestHook({
  handleRequest,
  request,
  headers = {},
  hook,
  context,
}: RequestHookOptions) {
  const startTimeMs = Date.now();
  const response = await handleRequest();
  const endTimeMs = Date.now();
  const durationMs = endTimeMs - startTimeMs;

  context.waitUntil(
    hook.fetch(request.url, {
      method: 'POST',
      signal: request.signal,
      body: JSON.stringify({
        request: {
          url: request.url,
          method: request.method,
          headers,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        },
        meta: {
          startTimeMs,
          endTimeMs,
          durationMs,
        },
      } satisfies RequestHookInfo),
    }),
  );

  return response;
}
