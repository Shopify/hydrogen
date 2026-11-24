/**
 * React Router passes the raw request to middleware, so single-fetch data
 * requests keep their `.data` suffix and internal `index`/`_routes` params.
 * Hydrogen matches its routes, locales, and redirects on the request URL, so it
 * needs the URL React Router routed instead. The clone keeps the original body
 * readable by route actions.
 */
export function toRoutedRequest(request: Request, url: URL): Request {
  if (url.href === request.url) return request;
  return new Request(url, request.clone());
}
