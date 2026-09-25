import type {Storefront} from '../storefront';
import {BUY_PERMALINK_RE} from '../utils/request';
import {parseSingleFetchPathname} from './redirect';

const MOCK_SHOP_PERMALINK_ORIGIN = 'https://demostore.mock.shop';

export function handleBuyPermalinkRedirect(
  request: Request,
  url: URL,
  storefront: Pick<Storefront, 'getShopifyDomain'>,
): Response | undefined {
  const {pathname, isSoftNavigation} = parseSingleFetchPathname(url.pathname);

  if (!BUY_PERMALINK_RE.test(pathname)) return;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {status: 405});
  }

  if (isSoftNavigation) {
    // Mutating URLSearchParams would re-encode the permalink query.
    const search = url.search
      .slice(1)
      .split('&')
      .filter((parameter) => {
        const name = parameter.split('=', 1)[0];
        try {
          return decodeURIComponent(name) !== '_routes';
        } catch {
          return true;
        }
      })
      .join('&');

    return new Response(null, {
      status: 204,
      headers: {
        'X-Remix-Redirect': pathname + (search ? `?${search}` : ''),
        'X-Remix-Reload-Document': 'true',
      },
    });
  }

  const {hostname, origin} = new URL(storefront.getShopifyDomain());
  // mock.shop hosts (pets.mock.shop, ...) don't render buy permalinks, so all hand off to the demo store.
  const storeOrigin =
    hostname === 'mock.shop' || hostname.endsWith('.mock.shop')
      ? MOCK_SHOP_PERMALINK_ORIGIN
      : origin;

  // UCP permalink response shape (303, no-store, no-referrer), forwarded verbatim since re-encoding would alter `continue_to`.
  // https://ucp.dev/2026-08-25/specification/permalink/#redirect-resolution
  return new Response(null, {
    status: 303,
    headers: {
      location: `${storeOrigin}${url.pathname}${url.search}`,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}
