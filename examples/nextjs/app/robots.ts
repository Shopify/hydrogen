import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "@/lib/site";

/**
 * `/robots.txt` (engineering.md F10). Allows all crawlers, points to the
 * sitemap, and disallows the cart + API surfaces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/api/"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
