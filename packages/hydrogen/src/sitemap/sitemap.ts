import type {LoaderFunctionArgs} from '@remix-run/server-runtime';

const SITEMAP_INDEX_PREFIX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
const SITEMAP_INDEX_SUFFIX = `\n</sitemapindex>`;

const SITEMAP_PREFIX = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`;
const SITEMAP_SUFFIX = `</urlset>`;

type SITEMAP_INDEX_TYPE =
  | 'pages'
  | 'products'
  | 'collections'
  | 'blogs'
  | 'articles'
  | 'metaObjects';

interface SitemapIndexOptions {
  /** The Storefront API Client from Hydrogen */
  storefront: LoaderFunctionArgs['context']['storefront'];
  /** A Remix Request object */
  request: Request;
  /** The types of pages to include in the sitemap index. */
  types?: SITEMAP_INDEX_TYPE[];
  /** Add a URL to a custom child sitemap */
  customChildSitemaps?: string[];
}

/**
 * Generate a sitemap index that links to separate sitemaps for each resource type. Returns a standard Response object.
 */
export async function getSitemapIndex(
  options: SitemapIndexOptions,
): Promise<Response> {
  const {
    storefront,
    request,
    types = [
      'products',
      'pages',
      'collections',
      'metaObjects',
      'articles',
      'blogs',
    ],
    customChildSitemaps = [],
  } = options;

  if (!request || !request.url)
    throw new Error('A request object is required to generate a sitemap index');

  if (!storefront || !storefront.query)
    throw new Error(
      'A storefront client is required to generate a sitemap index',
    );

  const data = await storefront.query(SITEMAP_INDEX_QUERY, {
    storefrontApiVersion: 'unstable',
  });

  if (!data) {
    throw new Response('No data found', {status: 404});
  }

  const baseUrl = new URL(request.url).origin;

  const body =
    SITEMAP_INDEX_PREFIX +
    types
      .map((type) => {
        if (!data[type]) {
          throw new Error(
            `[h2:sitemap:error] No data found for type ${type}. Check types passed to \`getSitemapIndex\``,
          );
        }
        return getSiteMapLinks(type, data[type].pagesCount.count, baseUrl);
      })
      .join('\n') +
    customChildSitemaps
      .map(
        (url) =>
          '  <sitemap><loc>' +
          (baseUrl + (url.startsWith('/') ? url : '/' + url)) +
          '</loc></sitemap>',
      )
      .join('\n') +
    SITEMAP_INDEX_SUFFIX;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}

interface GetSiteMapOptions {
  /** The params object from Remix */
  params: LoaderFunctionArgs['params'];
  /** The Storefront API Client from Hydrogen */
  storefront: LoaderFunctionArgs['context']['storefront'];
  /** A Remix Request object */
  request: Request;
  /** A function that produces a canonical url for a resource. It is called multiple times for each locale supported by the app. */
  getLink: (options: {
    type: string | SITEMAP_INDEX_TYPE;
    baseUrl: string;
    handle?: string;
    locale?: string;
  }) => string;
  /** An array of locales to generate alternate tags */
  locales?: string[];
  /** Optionally customize the changefreq property for each URL */
  getChangeFreq?: (options: {
    type: string | SITEMAP_INDEX_TYPE;
    handle: string;
  }) => string;
  /** If the sitemap has no links, fallback to rendering a link to the homepage. This prevents errors in Google's search console. Defaults to `/`.  */
  noItemsFallback?: string;
}

/**
 * Generate a sitemap for a specific resource type.
 */
export async function getSitemap(
  options: GetSiteMapOptions,
): Promise<Response> {
  const {
    storefront,
    request,
    params,
    getLink,
    locales = [],
    getChangeFreq,
    noItemsFallback = '/',
  } = options;

  if (!params)
    throw new Error(
      '[h2:sitemap:error] Remix params object is required to generate a sitemap',
    );

  if (!request || !request.url)
    throw new Error('A request object is required to generate a sitemap');

  if (!storefront || !storefront.query)
    throw new Error('A storefront client is required to generate a index');

  if (!getLink)
    throw new Error(
      'A `getLink` function to generate each resource is required to build a sitemap',
    );

  if (!params.type || !params.page)
    throw new Response('No data found', {status: 404});

  const type = params.type as keyof typeof QUERIES;

  const query = QUERIES[type];

  if (!query) throw new Response('Not found', {status: 404});

  const data = await storefront.query(query, {
    variables: {
      page: parseInt(params.page, 10),
    },
    storefrontApiVersion: 'unstable',
  });

  const baseUrl = new URL(request.url).origin;
  let body: string = '';

  if (!data?.sitemap?.resources?.items?.length) {
    body =
      SITEMAP_PREFIX +
      `\n  <url><loc>${baseUrl + noItemsFallback}</loc></url>\n` +
      SITEMAP_SUFFIX;
  } else {
    body =
      SITEMAP_PREFIX +
      data.sitemap.resources.items
        .map((item: {handle: string; updatedAt: string; type?: string}) => {
          return renderUrlTag({
            getChangeFreq,
            url: getLink({
              type: item.type ?? type,
              baseUrl,
              handle: item.handle,
            }),
            type,
            getLink,
            updatedAt: item.updatedAt,
            handle: item.handle,
            metaobjectType: item.type,
            locales,
            baseUrl,
          });
        })
        .join('\n') +
      SITEMAP_SUFFIX;
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}

function getSiteMapLinks(resource: string, count: number, baseUrl: string) {
  let links = ``;

  for (let i = 1; i <= count; i++) {
    links += `  <sitemap><loc>${baseUrl}/sitemap/${resource}/${i}.xml</loc></sitemap>\n`;
  }
  return links;
}

function renderUrlTag({
  url,
  updatedAt,
  locales,
  type,
  getLink,
  baseUrl,
  handle,
  getChangeFreq,
  metaobjectType,
}: {
  type: SITEMAP_INDEX_TYPE;
  baseUrl: string;
  handle: string;
  metaobjectType?: string;
  getLink: (options: {
    type: string;
    baseUrl: string;
    handle?: string;
    locale?: string;
  }) => string;
  url: string;
  updatedAt: string;
  locales: string[];
  getChangeFreq?: (options: {type: string; handle: string}) => string;
}) {
  return `<url>
  <loc>${url}</loc>
  <lastmod>${updatedAt}</lastmod>
  <changefreq>${
    getChangeFreq
      ? getChangeFreq({type: metaobjectType ?? type, handle})
      : 'weekly'
  }</changefreq>
${locales
  .map((locale) =>
    renderAlternateTag(
      getLink({type: metaobjectType ?? type, baseUrl, handle, locale}),
      locale,
    ),
  )
  .join('\n')}
</url>
  `.trim();
}

function renderAlternateTag(url: string, locale: string) {
  return `  <xhtml:link rel="alternate" hreflang="${locale}" href="${url}" />`;
}

const PRODUCT_SITEMAP_QUERY = `#graphql
    query SitemapProducts($page: Int!) {
      sitemap(type: PRODUCT) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
` as const;

const COLLECTION_SITEMAP_QUERY = `#graphql
    query SitemapCollections($page: Int!) {
      sitemap(type: COLLECTION) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
` as const;

const ARTICLE_SITEMAP_QUERY = `#graphql
    query SitemapArticles($page: Int!) {
      sitemap(type: ARTICLE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
` as const;

const PAGE_SITEMAP_QUERY = `#graphql
    query SitemapPages($page: Int!) {
      sitemap(type: PAGE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
` as const;

const BLOG_SITEMAP_QUERY = `#graphql
    query SitemapBlogs($page: Int!) {
      sitemap(type: BLOG) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
` as const;

const METAOBJECT_SITEMAP_QUERY = `#graphql
    query SitemapMetaobjects($page: Int!) {
      sitemap(type: METAOBJECT_PAGE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
            ... on SitemapResourceMetaobject {
              type
            }
          }
        }
      }
    }
` as const;

const SITEMAP_INDEX_QUERY = `#graphql
query SitemapIndex {
  products: sitemap(type: PRODUCT) {
    pagesCount {
      count
    }
  }
  collections: sitemap(type: COLLECTION) {
    pagesCount {
      count
    }
  }
  articles: sitemap(type: ARTICLE) {
    pagesCount {
      count
    }
  }
  pages: sitemap(type: PAGE) {
    pagesCount {
      count
    }
  }
  blogs: sitemap(type: BLOG) {
    pagesCount {
      count
    }
  }
  metaObjects: sitemap(type: METAOBJECT_PAGE) {
    pagesCount {
      count
    }
  }
}
` as const;

const QUERIES = {
  products: PRODUCT_SITEMAP_QUERY,
  articles: ARTICLE_SITEMAP_QUERY,
  collections: COLLECTION_SITEMAP_QUERY,
  pages: PAGE_SITEMAP_QUERY,
  blogs: BLOG_SITEMAP_QUERY,
  metaObjects: METAOBJECT_SITEMAP_QUERY,
};
