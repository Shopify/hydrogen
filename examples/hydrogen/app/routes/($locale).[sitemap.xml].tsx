import { getSitemapIndex, type Storefront } from "@shopify/hydrogen-classic";

import type { Route } from "./+types/($locale).[sitemap.xml]";

export async function loader({ request, context: { storefront } }: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront: storefront as unknown as Storefront,
    request,
  });

  response.headers.set("Cache-Control", `max-age=${60 * 60 * 24}`);

  return response;
}
