import {flattenConnection} from '@shopify/hydrogen';
import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
// import type {SitemapQuery} from 'storefrontapi.generated';

/**
 * the google limit is 50K, however, the storefront API
 * allows querying only 250 resources per pagination page
 */
const MAX_URLS = 250;

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const data = await storefront.query(SITEMAP_QUERY, {
    variables: {
      language: storefront.i18n.language,
    },
  });

  if (!data) {
    throw new Response('No data found', {status: 404});
  }

  const sitemap = generateSitemap({data, baseUrl: new URL(request.url).origin});

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',

      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}

// export async function loader({
//   request,
//   context: {storefront},
// }: LoaderFunctionArgs) {
//   // Hardcoded JSON data
//   const data = {
//     data: {
//       sitemapIndex: {
//         sitemaps: [
//           {
//             __typename: 'SitemapIndexEntry',
//             lastmod: '2024-03-20 13:40:05 +0000',
//             loc: 'sitemap_products_1.xml?from=1&amp;to=2',
//           },
//           {
//             __typename: 'SitemapIndexEntry',
//             lastmod: '2024-03-20 13:40:05 +0000',
//             loc: 'sitemap_pages_1.xml',
//           },
//           {
//             __typename: 'SitemapIndexEntry',
//             lastmod: '2024-03-20 13:40:05 +0000',
//             loc: 'sitemap_collections_1.xml',
//           },
//           {
//             __typename: 'SitemapIndexEntry',
//             lastmod: '2024-03-20 13:40:05 +0000',
//             loc: 'sitemap_blogs_1.xml',
//           },
//         ],
//       },
//     },
//   };

//   if (!data) {
//     throw new Response('No data found', {status: 404});
//   }

//   const sitemap = generateSitemap({data, baseUrl: new URL(request.url).origin});

//   return new Response(sitemap, {
//     headers: {
//       'Content-Type': 'application/xml',
//       'Cache-Control': `max-age=${60 * 60 * 24}`,
//     },
//   });
// }

function xmlEncode(string: string) {
  return string.replace(/[&<>'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function generateSitemap({
  data,
  baseUrl,
}: {
  data: Record<string, any>;
  baseUrl: string;
}) {
  const urls = data.sitemapIndex.sitemaps.map((sitemap: any) => {
    const url = `${baseUrl}/sitemap${sitemap.loc}`;
    const lastMod = sitemap.lastmod;

    return {url, lastMod};
  });

  // return `
  //   <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  //     ${urls
  //       .map(({url, lastMod}) => {
  //         return `
  //         <sitemap>
  //             <loc>${url}</loc>
  //             <lastmod>${lastMod}</lastmod>
  //         </sitemap>
  //       `;
  //       })
  //       .join('')}
  //   </sitemapindex>
  //   `;

  return `
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls
        .map(({url, lastMod}) => {
          return `
          <sitemap>
              <loc>${url}</loc>
          </sitemap>
        `;
        })
        .join('')}
    </sitemapindex>
    `;
}

const SITEMAP_QUERY = `#graphql
  query Sitemap($language: LanguageCode)
  @inContext(language: $language) {
    sitemapIndex {
      sitemaps {
        __typename
        loc
        lastmod
      }
    }
  }
` as const;
