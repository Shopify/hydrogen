import { createSitemapIndexResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).[sitemap.xml]";

export async function loader({ request, context: { storefront } }: Route.LoaderArgs) {
  return createSitemapIndexResponse({ request, storefront });
}
