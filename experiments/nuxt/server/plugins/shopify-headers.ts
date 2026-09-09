export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    const requestContext = event.context.shopifyRequestContext;
    if (!requestContext) return;

    const response = event.node.res;
    const headers = createHeaders(response.getHeaders());

    requestContext.applyResponseHeaders(headers);
    syncHeaders(response, headers);
  });
});

type ResponseHeaders = Record<string, number | string | string[] | undefined>;

function createHeaders(source: ResponseHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value != null) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

function syncHeaders(
  response: {
    getHeaders(): ResponseHeaders;
    removeHeader(name: string): void;
    setHeader(name: string, value: number | string | readonly string[]): unknown;
  },
  headers: Headers,
) {
  for (const name of Object.keys(response.getHeaders())) {
    if (!headers.has(name)) response.removeHeader(name);
  }
  for (const [name, value] of headers) {
    if (name !== "set-cookie") response.setHeader(name, value);
  }

  const setCookies = headers.getSetCookie();
  if (setCookies.length > 0) response.setHeader("set-cookie", setCookies);
  else response.removeHeader("set-cookie");
}
