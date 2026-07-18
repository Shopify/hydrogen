import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "~/lib/site";

function methodNotAllowed() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "GET, HEAD" },
  });
}

/**
 * `/robots.txt` resource route (engineering.md F10). Points to the sitemap and
 * allows all crawlers.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
      ANY: methodNotAllowed,
    },
  },
});
