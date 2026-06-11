import { getSitemap, type Storefront } from "@shopify/hydrogen-classic";

import type { Route } from "./+types/($locale).sitemap.$type.$page[.xml]";

export async function loader({ request, params, context: { storefront } }: Route.LoaderArgs) {
  const response = await getSitemap({
    storefront: storefront as unknown as Storefront,
    request,
    params,
    locales: ["EN-US", "EN-CA", "FR-CA"],
    getLink: ({ type, baseUrl, handle, locale }) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  response.headers.set("Cache-Control", `max-age=${60 * 60 * 24}`);

  return response;
}
