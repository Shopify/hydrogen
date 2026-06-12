// Splat route. Only reached when root middleware doesn't short-circuit the
// request for a Hydrogen-owned route, registered route, or configured redirect.

import { handleShopifyRedirects } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "react-router";

import { storefrontClientContext } from "~/lib/storefront";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const result = await handleShopifyRedirects({
    request,
    storefrontClient: context.get(storefrontClientContext),
  });
  if (result) return result;

  throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
  return null;
}
