type Service = {fetch: typeof fetch};

export async function miniOxygenHandler(
  request: Request,
  env: {
    entry: Service;
    assets?: Service;
    logRequest: Service;
    staticAssetExtensions?: string[];
    oxygenHeadersMap: Record<string, string>;
  },
  context: ExecutionContext,
) {
  const url = new URL(request.url);

  // Replace branded tunnel domains:
  if (url.hostname.endsWith('.trycloudflare.com')) {
    url.hostname = url.hostname.replace(
      '.trycloudflare.com',
      '.tryhydrogen.dev',
    );
  }

  if (env.assets && env.staticAssetExtensions && request.method === 'GET') {
    const staticAssetExtensions = new Set(env.staticAssetExtensions);
    const wellKnown = url.pathname.startsWith('/.well-known');
    const extension = url.pathname.split('.').at(-1) ?? '';
    const isAsset =
      wellKnown || !!staticAssetExtensions.has(extension.toUpperCase());

    if (isAsset) {
      const response = await env.assets.fetch(
        new Request(url, {
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

  const startTimeMs = Date.now();
  const response = await env.entry.fetch(
    url,
    new Request(request, requestInit),
  );
  const durationMs = Date.now() - startTimeMs;

  context.waitUntil(
    env.logRequest.fetch(
      new Request(url, {
        method: request.method,
        signal: request.signal,
        headers: {
          ...requestInit.headers,
          'o2-duration-ms': String(durationMs),
          'o2-response-status': String(response.status),
        },
      }),
    ),
  );

  return response;
}
