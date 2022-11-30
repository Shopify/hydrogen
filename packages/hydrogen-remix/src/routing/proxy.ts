export async function proxyLiquidRoute(
  request: Request,
  storefrontDomain: string,
  destinationPath: string,
): Promise<Response> {
  const clientIP = request.headers.get('X-Shopify-Client-IP');
  const clientIPSig = request.headers.get('X-Shopify-Client-IP-Sig');

  // @todo - filter out google bot user agents when proxying

  const newHost = `${storefrontDomain}.myshopify.com`;
  const host = new URL(request.url).host;

  const headers = swapHeaderHostname(request.headers, host, newHost);

  if (!clientIP || !clientIPSig) {
    console.warn(
      'Proxying the online store is only available in Oxygen. This request is likely to be throttled.',
    );
  }

  return fetch(
    `https://${newHost}${
      destinationPath.startsWith('/') ? destinationPath : '/' + destinationPath
    }`,
    {headers},
  ).then((resp) => {
    const headers = swapHeaderHostname(resp.headers, newHost, host);
    headers.delete('content-encoding');
    return new Response(resp.body, {headers});
  });
}

function swapHeaderHostname(
  headers: Headers,
  hostname: string,
  newHostname: string,
) {
  const newHeaders = new Headers();

  const headersToFilterOut = ['connection'];

  for (const [key, value] of headers.entries()) {
    if (!headersToFilterOut.includes(key)) {
      newHeaders.append(key, value.replaceAll(hostname, newHostname));
    }
  }

  return newHeaders;
}
