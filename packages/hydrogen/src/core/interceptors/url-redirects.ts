import { gql } from "../../graphql";
import type { RedirectOptions } from "../handle-shopify-redirects";

const REDIRECT_QUERY = gql(`
  query redirects($query: String) {
    urlRedirects(first: 1, query: $query) {
      edges {
        node {
          target
        }
      }
    }
  }
`);

// Used as a base for `new URL()` when constructing relative redirect URLs.
// Stripped from the output — only needed because `new URL` requires a base for relative paths.
const PLACEHOLDER_BASE = "https://0.0.0.0";

export async function handleUrlRedirects({
  request,
  storefrontClient,
}: RedirectOptions): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  const queryPath = pathname.toLowerCase().replace(/\/+$/, "");
  const result = await storefrontClient.graphql(REDIRECT_QUERY, {
    variables: { query: `path:${queryPath}` },
  });

  const target = result.data?.urlRedirects?.edges[0]?.node.target;
  if (!target) return null;

  return createRedirectResponse(target, searchParams);
}

function createRedirectResponse(location: string, searchParams: URLSearchParams): Response {
  const url = new URL(location, PLACEHOLDER_BASE);

  for (const [key, value] of searchParams) {
    url.searchParams.append(key, value);
  }

  return new Response(null, {
    status: 301,
    headers: { location: url.toString().replace(PLACEHOLDER_BASE, "") },
  });
}
