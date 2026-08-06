import type { LoaderFunctionArgs } from "react-router";

import { getSiteOrigin } from "~/lib/config";
import { envContext } from "~/lib/platform";

export function loader({ context }: LoaderFunctionArgs) {
  const siteOrigin = getSiteOrigin(context.get(envContext));
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
