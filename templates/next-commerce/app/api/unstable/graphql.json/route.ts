import {
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from '@shopify/hydrogen-react';
import {ensureStartsWith} from 'lib/utils';
import {NextRequest, NextResponse} from 'next/server';

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartsWith(process.env.SHOPIFY_STORE_DOMAIN, 'https://')
  : '';
const endpoint = domain ? `${domain}/api/unstable/graphql.json` : '';
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  if (!endpoint || !storefrontAccessToken) {
    return NextResponse.json(
      {error: 'Shopify storefront is not configured'},
      {status: 500},
    );
  }

  const requestBody = await request.text();
  const upstreamResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      ...(request.headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER)
        ? {
            [SHOPIFY_UNIQUE_TOKEN_HEADER]: request.headers.get(
              SHOPIFY_UNIQUE_TOKEN_HEADER,
            )!,
          }
        : {}),
      ...(request.headers.get(SHOPIFY_VISIT_TOKEN_HEADER)
        ? {
            [SHOPIFY_VISIT_TOKEN_HEADER]: request.headers.get(
              SHOPIFY_VISIT_TOKEN_HEADER,
            )!,
          }
        : {}),
    },
    body: requestBody,
    cache: 'no-store',
  });

  const responseHeaders = new Headers();
  const contentType = upstreamResponse.headers.get('content-type');
  const serverTiming = upstreamResponse.headers.get('server-timing');

  if (contentType) {
    responseHeaders.set('content-type', contentType);
  }

  if (serverTiming) {
    responseHeaders.set('server-timing', serverTiming);
  }

  const setCookieHeaders = (
    upstreamResponse.headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie?.();

  setCookieHeaders?.forEach((value) => {
    responseHeaders.append('set-cookie', value);
  });

  return new NextResponse(await upstreamResponse.text(), {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
