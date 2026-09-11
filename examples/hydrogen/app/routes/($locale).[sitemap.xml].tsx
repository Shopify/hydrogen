import { createSitemapIndexResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).[sitemap.xml]";

const SITEMAP_MAX_AGE_SECONDS = 86_400;
const SITEMAP_CACHE_CONTROL = `max-age=${SITEMAP_MAX_AGE_SECONDS}`;

export async function loader({ request, context: { storefront } }: Route.LoaderArgs) {
  const response = await createSitemapIndexResponse({ request, storefront });
  response.headers.set("Cache-Control", SITEMAP_CACHE_CONTROL);

  return response;
}
