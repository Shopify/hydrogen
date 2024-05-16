import type {UrlRedirectConnection} from '@shopify/hydrogen-react/storefront-api-types';
import type {I18nBase, Storefront} from '../storefront';
import {getRedirectUrl} from '../utils/get-redirect-url';

type StorefrontRedirect = {
  /** The [Storefront client](/docs/api/hydrogen/2024-04/utilities/createstorefrontclient) instance */
  storefront: Storefront<I18nBase>;
  /** The [MDN Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object that was passed to the `server.ts` request handler. */
  request: Request;
  /** The [MDN Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object created by `handleRequest` */
  response?: Response;
  /** By default the `/admin` route is redirected to the Shopify Admin page for the current storefront. Disable this redirect by passing `true`. */
  noAdminRedirect?: boolean;
  /** By default, query parameters are not used to match redirects. Set this to `true` if you'd like redirects to be query parameter sensitive */
  matchQueryParams?: boolean;
};

/**
 * Queries the Storefront API to see if there is any redirect
 * created for the current route and performs it. Otherwise,
 * it returns the response passed in the parameters. Useful for
 * conditionally redirecting after a 404 response.
 *
 * @see {@link https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect Creating URL redirects in Shopify}
 */
export async function storefrontRedirect(
  options: StorefrontRedirect,
): Promise<Response> {
  const {
    storefront,
    request,
    noAdminRedirect,
    matchQueryParams,
    response = new Response('Not Found', {status: 404}),
  } = options;

  const url = new URL(request.url);
  const {pathname, searchParams} = url;
  const isSoftNavigation = searchParams.has('_data');

  searchParams.delete('redirect');
  searchParams.delete('return_to');
  searchParams.delete('_data');

  const redirectFrom = (
    matchQueryParams ? url.toString().replace(url.origin, '') : pathname
  ).toLowerCase();

  if (url.pathname === '/admin' && !noAdminRedirect) {
    return createRedirectResponse(
      `${storefront.getShopifyDomain()}/admin`,
      isSoftNavigation,
      searchParams,
      matchQueryParams,
    );
  }

  try {
    const {urlRedirects} = await storefront.query<{
      urlRedirects: UrlRedirectConnection;
    }>(REDIRECT_QUERY, {
      // The admin doesn't allow redirects to have a
      // trailing slash, so strip them all off
      variables: {query: 'path:' + redirectFrom.replace(/\/+$/, '')},
    });

    const location = urlRedirects?.edges?.[0]?.node?.target;

    if (location) {
      return createRedirectResponse(
        location,
        isSoftNavigation,
        searchParams,
        matchQueryParams,
      );
    }

    const redirectTo = getRedirectUrl(request.url);

    if (redirectTo) {
      return createRedirectResponse(
        redirectTo,
        isSoftNavigation,
        searchParams,
        matchQueryParams,
      );
    }
  } catch (error) {
    console.error(
      `Failed to fetch redirects from Storefront API for route ${redirectFrom}`,
      error,
    );
  }

  return response;
}

const TEMP_DOMAIN = 'https://example.com';

function createRedirectResponse(
  location: string,
  isSoftNavigation: boolean,
  searchParams: URLSearchParams,
  matchQueryParams?: boolean,
) {
  const url = new URL(location, TEMP_DOMAIN);

  if (!matchQueryParams) {
    for (const [key, value] of searchParams) {
      // The redirect destination might include query params, so merge the
      // original query params with the redirect destination query params
      url.searchParams.append(key, value);
    }
  }

  if (isSoftNavigation) {
    return new Response(null, {
      status: 200,
      headers: {
        'X-Remix-Redirect': url.toString().replace(TEMP_DOMAIN, ''),
        'X-Remix-Status': '301',
      },
    });
  } else {
    return new Response(null, {
      status: 301,
      headers: {location: url.toString().replace(TEMP_DOMAIN, '')},
    });
  }
}

const REDIRECT_QUERY = `#graphql
  query redirects($query: String) {
    urlRedirects(first: 1, query: $query) {
      edges {
        node {
          target
        }
      }
    }
  }
`;
