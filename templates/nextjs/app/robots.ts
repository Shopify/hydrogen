import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "@/lib/site";

/**
 * `/robots.txt`. Allows all crawlers, points to the
 * sitemap, and disallows the cart (unprefixed and under any locale prefix) +
 * API surfaces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/*/cart", "/api/"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
