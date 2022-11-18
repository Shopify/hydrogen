import {HydrogenContext} from '..';

export async function notFoundMaybeRedirect(
  request: Request,
  context: HydrogenContext,
): Promise<Response> {
  const {pathname, search} = new URL(request.url);
  const {urlRedirects} = await context.storefront.query<{
    urlRedirects: {
      edges: Array<{node: {target: string}}>;
    };
  }>(REDIRECT_QUERY, {
    variables: {
      url: pathname + search,
    },
  });

  if (urlRedirects?.edges?.length) {
    return new Response(null, {
      status: 302,
      headers: {
        location: urlRedirects.edges[0]?.node?.target!,
      },
    });
  } else {
    return new Response('Not found', {status: 404});
  }
}

const REDIRECT_QUERY = `#graphql
  query redirects($url:String) {
    urlRedirects(first:1, query:$url) {
      edges {
        node {
          target
        }
      }
    }
  }
`;
