import { createSitemapResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).sitemap.$type.$page[.xml]";

const SITEMAP_MAX_AGE_SECONDS = 86_400;
const SITEMAP_CACHE_CONTROL = `max-age=${SITEMAP_MAX_AGE_SECONDS}`;
const SITEMAP_LOCALES = ["EN-US", "EN-CA", "FR-CA"];

export async function loader({ request, params, context: { storefront } }: Route.LoaderArgs) {
  const response = await createSitemapResponse({
    storefront,
    request,
    params,
    locales: SITEMAP_LOCALES,
    getLink: ({ type, baseUrl, handle, locale }) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  response.headers.set("Cache-Control", SITEMAP_CACHE_CONTROL);

  return response;
}
