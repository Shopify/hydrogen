import { createController } from "remix/router";

import { createSitemapIndexResponse, createSitemapResponse } from "../../lib/sitemap.ts";
import { routes } from "../../routes.ts";

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
const SITEMAP_LOCALES = ["EN-US", "EN-CA", "FR-CA"];

export default createController(routes.seo, {
  actions: {
    robots({ request }) {
      return new Response(robotsTxt(new URL(request.url).origin), {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": `max-age=${ONE_DAY_IN_SECONDS}`,
        },
      });
    },

    async sitemapIndex({ request, shopify }) {
      const response = await createSitemapIndexResponse({
        request,
        storefront: shopify.storefront,
      });
      response.headers.set("Cache-Control", `max-age=${ONE_DAY_IN_SECONDS}`);
      return response;
    },

    async sitemap({ params, request, shopify }) {
      const response = await createSitemapResponse({
        storefront: shopify.storefront,
        request,
        params,
        locales: SITEMAP_LOCALES,
        getLink: ({ type, baseUrl, handle, locale }) =>
          locale
            ? `${baseUrl}/${locale.toLowerCase()}/${type}/${handle}`
            : `${baseUrl}/${type}/${handle}`,
      });
      response.headers.set("Cache-Control", `max-age=${ONE_DAY_IN_SECONDS}`);
      return response;
    },
  },
});

function robotsTxt(origin: string) {
  const sitemapUrl = `${origin}/sitemap.xml`;

  return `
User-agent: *
${generalDisallowRules(sitemapUrl)}

# Google adsbot ignores robots.txt unless specifically named!
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /search
Allow: /search/
Disallow: /search/?*

User-agent: Nutch
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 10
${generalDisallowRules(sitemapUrl)}

User-agent: AhrefsSiteAudit
Crawl-delay: 10
${generalDisallowRules(sitemapUrl)}

User-agent: MJ12bot
Crawl-Delay: 10

User-agent: Pinterest
Crawl-delay: 1
`.trim();
}

/** Mirrors the defaults of Shopify's Online Store robots.txt. */
function generalDisallowRules(sitemapUrl: string) {
  return `Disallow: /cart
Disallow: /account
Disallow: /collections/*sort_by*
Disallow: /*/collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /collections/*%2b*
Disallow: /*/collections/*+*
Disallow: /*/collections/*%2B*
Disallow: /*/collections/*%2b*
Disallow: /*/collections/*filter*&*filter*
Disallow: /blogs/*+*
Disallow: /blogs/*%2B*
Disallow: /blogs/*%2b*
Disallow: /*/blogs/*+*
Disallow: /*/blogs/*%2B*
Disallow: /*/blogs/*%2b*
Disallow: /policies/
Disallow: /search
Allow: /search/
Disallow: /search/?*
Sitemap: ${sitemapUrl}`;
}
