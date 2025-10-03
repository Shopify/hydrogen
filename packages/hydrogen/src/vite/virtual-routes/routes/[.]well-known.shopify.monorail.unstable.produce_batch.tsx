import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';

export async function action({request, context}: ActionFunctionArgs) {
  const shopifyStoreDomain = (context?.env as {SHOPIFY_STORE_DOMAIN?: string})
    ?.SHOPIFY_STORE_DOMAIN;

  if (!shopifyStoreDomain) {
    return new Response('', {status: 204});
  }

  try {
    const body = await request.text();
    const url = new URL(request.url);

    const response = await fetch(
      `https://${shopifyStoreDomain}${url.pathname}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'text/plain',
        },
        body,
      },
    );

    const respHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (error) {
    console.error('[Monorail Proxy] Error forwarding to Shopify theme:', error);
    return new Response('', {status: 204});
  }
}

export async function loader() {
  return new Response('Method not allowed', {status: 405});
}
