import {redirect, json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | sitemap`}];
};

export async function loader({
  request,
  params,
  context: {storefront},
}: LoaderFunctionArgs) {
  const {handle} = params;
  if (!handle) {
    return redirect('/sitemap.xml');
  }

  const [sitemapType, page] = handle.split('_');
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!sitemapType || !page) {
    return redirect('/sitemap.xml');
  }

  let sitemapTypeGl;

  switch (sitemapType) {
    case 'products':
      sitemapTypeGl = 'SITEMAP_PRODUCT';
      break;
    case 'pages':
      sitemapTypeGl = 'SITEMAP_PAGE';
      break;
    case 'collections':
      sitemapTypeGl = 'SITEMAP_COLLECTION';
      break;
    case 'blogs':
      sitemapTypeGl = 'SITEMAP_BLOG';
      break;
    default:
      return redirect('/sitemap.xml');
  }

  console.log(sitemapTypeGl, page, from, to);

  const data = await storefront.query(SITEMAP_QUERY, {
    variables: {
      page: parseInt(page),
      sitemapType: sitemapTypeGl,
      from: from ? parseInt(from) : undefined,
      to: to ? parseInt(to) : undefined,
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

function generateSitemap({
  data,
  baseUrl,
}: {
  data: Record<string, any>;
  baseUrl: string;
}) {
  const urls = data.sitemap.map((sitemap: any) => {
    const loc = sitemap.loc === '/' ? baseUrl : `${baseUrl}${sitemap.loc}`;
    const lastmod = sitemap.lastmod;
    const changefreq = sitemap.changefreq;
    const image = sitemap.image;
    if (image) {
      image.loc = `${baseUrl}${stripUrl(image.loc)}`;
    }


    return {loc, lastmod, changefreq, image};
  });

  return `
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    >
      ${urls.map(renderUrlTag).join('')}
    </urlset>`;
}

function stripUrl(url) {
  const baseUrl = 'https://cdn.shopify.';
  const endUrl = '.spin.dev';
  const regex = new RegExp(`${baseUrl}.*${endUrl}`, 'g');
  return url.replace(regex, '');
}

function renderUrlTag({loc, lastmod, changefreq, image}) {
  const imageTag = image
    ? `<image:image>
        <image:loc>${image.loc}</image:loc>
        <image:title>${image.title ?? ''}</image:title>
        <image:caption>${image.caption ?? ''}</image:caption>
      </image:image>`.trim()
    : '';

  return `
    <url>
      <loc>${loc}</loc>
      ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
      <changefreq>${changefreq}</changefreq>
      ${imageTag}
    </url>
  `.trim();
}

const SITEMAP_QUERY = `#graphql
  query Sitemap($language: LanguageCode, $page: Int!, $from: Int, $to: Int, $sitemapType: String!)
  @inContext(language: $language) {
    sitemap(page: $page, type: $sitemapType, from: $from, to: $to) {
      changefreq
      lastmod
      loc
      image {
        caption
        loc
        title
      }
    }
  }
` as const;
