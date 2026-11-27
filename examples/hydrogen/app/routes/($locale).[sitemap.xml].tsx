import { withStorefrontRateLimit } from "@shopify/hydrogen";

import { createSitemapIndexResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).[sitemap.xml]";

export const loader = withStorefrontRateLimit(
  async ({ request, context: { storefront } }: Route.LoaderArgs) => {
    return createSitemapIndexResponse({ request, storefront });
  },
);
