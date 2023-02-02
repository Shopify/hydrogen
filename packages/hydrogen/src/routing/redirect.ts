import {redirect} from '@remix-run/server-runtime';
import type {UrlRedirectConnection} from '@shopify/hydrogen-react/storefront-api-types';
import type {I18nBase, Storefront} from '../storefront';

type StorefrontRedirect = {
  storefront: Storefront<I18nBase>;
  request: Request;
  response?: Response;
};

/**
 * Queries the Storefront API to see if there is any redirect
 * created for the current route and performs it. Otherwise,
 * it returns the response passed in the parameters. Useful for
 * conditionally redirecting after a 404 response.
 *
 * @see {@link https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect Creating URL redirects in Shopify}
 */
export async function storefrontRedirect({
  storefront,
  request,
  response = new Response('Not Found', {status: 404}),
}: StorefrontRedirect): Promise<Response> {
  const {pathname, search} = new URL(request.url);
  const redirectFrom = pathname + search;

  try {
    const {urlRedirects} = await storefront.query<{
      urlRedirects: UrlRedirectConnection;
    }>(REDIRECT_QUERY, {
      variables: {query: 'path:' + redirectFrom},
      storefrontApiVersion: '2023-01',
    });

    const location = urlRedirects?.edges?.[0]?.node?.target;

    if (location) {
      return new Response(null, {status: 302, headers: {location}});
    }

    const searchParams = new URLSearchParams(search);
    const redirectTo =
      searchParams.get('return_to') || searchParams.get('redirect');

    if (redirectTo) {
      if (isLocalPath(redirectTo)) {
        return redirect(redirectTo);
      } else {
        console.warn(
          `Cross-domain redirects are not supported. Tried to redirect from ${redirectFrom} to ${redirectTo}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Failed to fetch redirects from Storefront API for route ${redirectFrom}`,
      error,
    );
  }

  return response;
}

function isLocalPath(url: string) {
  try {
    // We don't want to redirect cross domain,
    // doing so could create fishing vulnerability
    // If `new URL()` succeeds, it's a fully qualified
    // url which is cross domain. If it fails, it's just
    // a path, which will be the current domain.
    new URL(url);
  } catch (e) {
    return true;
  }

  return false;
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
