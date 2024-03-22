import type {UrlRedirectConnection} from '@shopify/hydrogen-react/storefront-api-types';
import type {I18nBase, Storefront} from '../storefront';
import {getRedirectUrl} from '../utils/get-redirect-url';

type StorefrontRedirect = {
  /** The [Storefront client](/docs/api/hydrogen/2024-01/utilities/createstorefrontclient) instance */
  storefront: Storefront<I18nBase>;
  /** The [MDN Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object that was passed to the `server.ts` request handler. */
  request: Request;
  /** The [MDN Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object created by `handleRequest` */
  response?: Response;
  /** By default the `/admin` route is redirected to the Shopify Admin page for the current storefront. Disable this redirect by passing `true`. */
  noAdminRedirect?: boolean;
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
    response = new Response('Not Found', {status: 404}),
  } = options;

  const url = new URL(request.url);
  const isSoftNavigation = url.searchParams.has('_data');

  url.searchParams.delete('_data');

  const redirectFrom = url.toString().replace(url.origin, '');

  if (url.pathname === '/admin' && !noAdminRedirect) {
    return createRedirectResponse(
      `${storefront.getShopifyDomain()}/admin`,
      isSoftNavigation,
    );
  }

  try {
    const {urlRedirects} = await storefront.query<{
      urlRedirects: UrlRedirectConnection;
    }>(REDIRECT_QUERY, {
      variables: {query: 'path:' + redirectFrom},
    });

    const location = urlRedirects?.edges?.[0]?.node?.target;

    if (location) {
      return createRedirectResponse(location, isSoftNavigation);
    }

    const redirectTo = getRedirectUrl(request.url);

    if (redirectTo) {
      return createRedirectResponse(redirectTo, isSoftNavigation);
    }
  } catch (error) {
    console.error(
      `Failed to fetch redirects from Storefront API for route ${redirectFrom}`,
      error,
    );
  }

  return response;
}

function createRedirectResponse(location: string, isSoftNavigation: boolean) {
  if (isSoftNavigation) {
    return new Response(null, {
      status: 200,
      headers: {'X-Remix-Redirect': location, 'X-Remix-Status': '302'},
    });
  } else {
    return new Response(null, {
      status: 302,
      headers: {location: location},
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
