import type { LoaderFunctionArgs } from "react-router";

import { SITE_ORIGIN } from "~/lib/site";

/**
 * `/robots.txt` resource route (engineering.md F10). Points to the sitemap and
 * allows all crawlers.
 */
export function loader(_: LoaderFunctionArgs) {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
