import {
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {useCatch, useRouteError, isRouteErrorResponse} from '@remix-run/react';
import type {Shop} from '@shopify/hydrogen/storefront-api-types';
import {parseGid} from '@shopify/hydrogen';

export const loader = async ({request, context}: LoaderArgs) => {
  const url = new URL(request.url);

  const {shop} = await context.storefront.query<{shop: Pick<Shop, 'id'>}>(
    SHOP_QUERY,
  );

  return new Response(
    robotsTxtData({url: url.origin, shopId: parseGid(shop.id).id}),
    {
      status: 200,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'text/plain',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Cache-Control': `max-age=${60 * 60 * 24}`,
      },
    },
  );
};

export const ErrorBoundaryV1: ErrorBoundaryComponent = ({error}) => {
  console.error(error);

  return <div>There was an error.</div>;
};

export function CatchBoundary() {
  const caught = useCatch();
  console.error(caught);

  return (
    <div>
      There was an error. Status: {caught.status}. Message:{' '}
      {caught.data?.message}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error((error as Error).message);
    return <div>Thrown Error</div>;
  }
}

function robotsTxtData({url, shopId}: {shopId?: string; url?: string}) {
  const sitemapUrl = url ? `${url}/sitemap.xml` : undefined;

  return `
User-agent: *
${generalDisallowRules({sitemapUrl, shopId})}

# Google adsbot ignores robots.txt unless specifically named!
User-agent: adsbot-google
Disallow: /checkouts/
Disallow: /checkout
Disallow: /carts
Disallow: /orders${
    shopId
      ? `
Disallow: /${shopId}/checkouts
Disallow: /${shopId}/orders`
      : ''
  }
Disallow: /*?*oseid=*
Disallow: /*preview_theme_id*
Disallow: /*preview_script_id*

User-agent: Nutch
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 10
${generalDisallowRules({sitemapUrl, shopId})}

User-agent: AhrefsSiteAudit
Crawl-delay: 10
${generalDisallowRules({sitemapUrl, shopId})}

User-agent: MJ12bot
Crawl-Delay: 10

User-agent: Pinterest
Crawl-delay: 1
`.trim();
}

/**
 *
 * This function generates disallow rules that generally follow what Shopify's Online Store has as defaults for their robots.txt
 *
 */
function generalDisallowRules({
  shopId,
  sitemapUrl,
}: {
  shopId?: string;
  sitemapUrl?: string;
}) {
  return `Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkouts/
Disallow: /checkout${
    shopId
      ? `
Disallow: /${shopId}/checkouts
Disallow: /${shopId}/orders`
      : ''
  }
Disallow: /carts
Disallow: /account
Disallow: /collections/*sort_by*
Disallow: /*/collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /collections/*%2b*
Disallow: /*/collections/*+*
Disallow: /*/collections/*%2B*
Disallow: /*/collections/*%2b*
Disallow: */collections/*filter*&*filter*
Disallow: /blogs/*+*
Disallow: /blogs/*%2B*
Disallow: /blogs/*%2b*
Disallow: /*/blogs/*+*
Disallow: /*/blogs/*%2B*
Disallow: /*/blogs/*%2b*
Disallow: /*?*oseid=*
Disallow: /*preview_theme_id*
Disallow: /*preview_script_id*
Disallow: /policies/
Disallow: /*/*?*ls=*&ls=*
Disallow: /*/*?*ls%3D*%3Fls%3D*
Disallow: /*/*?*ls%3d*%3fls%3d*
Disallow: /search
Allow: /search/
Disallow: /search/?*
Disallow: /apple-app-site-association
Disallow: /.well-known/shopify/monorail${
    sitemapUrl
      ? `
Sitemap: ${sitemapUrl}`
      : ''
  }`;
}

const SHOP_QUERY = `#graphql
  query robots_shop_query {
    shop {
      id
    }
  }
`;
