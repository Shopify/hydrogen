export async function proxyLiquidRoute(
  request: Request,
  storefrontDomain: string,
  destinationPath: string,
): Promise<Response> {
  const clientIP = request.headers.get('X-Shopify-Client-IP');
  const clientIPSig = request.headers.get('X-Shopify-Client-IP-Sig');

  const headers = new Headers();
  const host = `${storefrontDomain}.myshopify.com`;

  const headersToFilterOut = ['connection'];

  for (const [key, value] of request.headers.entries()) {
    if (!headersToFilterOut.includes(key)) {
      headers.append(
        key,
        swapHostname(value, {
          hostname: new URL(request.url).host,
          newHostname: host,
        }),
      );
    }
  }

  if (!clientIP || !clientIPSig) {
    console.warn(
      'Proxying the online store is only available in Oxygen. This request is likely to be throttled.',
    );
  }

  return fetch(
    `https://${host}${
      destinationPath.startsWith('/') ? destinationPath : '/' + destinationPath
    }`,
    {headers},
  ).then((resp) => {
    const headers = new Headers(resp.headers);
    headers.delete('content-encoding');
    return new Response(resp.body, {headers});
  });
}

function swapHostname(
  str: string,
  {hostname, newHostname}: {hostname: string; newHostname: string},
) {
  return str.replaceAll(hostname, newHostname);
}
