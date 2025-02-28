/**
 * Partytown will call this function to resolve any URLs
 * Many third-party scripts already provide the correct CORS headers, but not all do. For services that do not add the correct headers, then a reverse proxy to another domain must be used in order to provide the CORS headers.
 * @param url - the URL to resolve
 * @param location - the current location
 * @param type - the type of request (script, image, etc)
 * @returns URL or proxy URL
 * @see https://partytown.builder.io/proxying-requests
 */
export function maybeProxyRequest(url: URL, location: Location, type: string) {
  const nonProxyDomains = ['www.googletagmanager.com'];

  // Don't proxy requests to certain domains
  const bypassProxy = nonProxyDomains.some((domain) =>
    url.host.includes(domain),
  );

  // Don't proxy requests that aren't scripts
  if (type !== 'script' || bypassProxy) {
    return url;
  }

  // If the url is already reverse proxied, don't proxy it again
  if (url.href.includes('/reverse-proxy')) {
    return url;
  }

  // Otherwise, proxy the url
  const proxyUrl = new URL(`${location.origin}/reverse-proxy`);
  proxyUrl.searchParams.append('apiUrl', url.href);

  return proxyUrl;
}
