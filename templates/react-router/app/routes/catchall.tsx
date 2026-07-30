import { handleShopifyRedirects } from "@shopify/hydrogen";

import { routeTemplates } from "~/lib/route-templates";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/catchall";

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const redirect = await handleShopifyRedirects({ request, storefrontClient, routeTemplates });
  if (redirect) return redirect;
  throw new Response("Not Found", { status: 404 });
}

export default function CatchAllRoute() {
  return null;
}
