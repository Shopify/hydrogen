import type {Storefront} from '@shopify/hydrogen';
import type {
  Blog,
  Collection,
  Page,
  Product,
} from '@shopify/hydrogen/storefront-api-types';
import type {LoaderArgs} from '@shopify/remix-oxygen';
import {
  escapeXml,
  type ResourceConnection,
  type Resource,
} from './[sitemap.xml]';

export async function loader({request, params, context}: LoaderArgs) {
  const {storefront} = context;
  const catchAll = params['*'];
  if (!catchAll) {
    throw new Response(`${new URL(request.url).pathname} not found`, {
      status: 404,
    });
  }

  const isSiteMapPage = catchAll.endsWith('.xml');
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const from = searchParams.has('from') ? searchParams.get('from') : null;
  const pageSize = searchParams.has('pageSize')
    ? Number(searchParams.get('pageSize'))
    : 250;

  if (!isSiteMapPage) {
    throw new Response(`Invalid sitemap page`, {
      status: 404,
    });
  }

  const [resource] = catchAll.split('_') as [Resource];

  const entries = await fetchPagedResource({
    baseUrl: url.origin,
    from,
    pageSize,
    query: QUERY?.[resource],
    resource,
    storefront,
  });

  const sitemapXml = generateSitemapXml(entries);

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}

function generateSitemapXml(entries: Array<any>) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
      ${entries.join('')}
    </urlset>
  `;
}

function toUrlTag(baseUrl: string) {
  return function (entry: any) {
    const handle = entry?.handle;
    const resource = entry?.__typename?.toLowerCase();
    const image = entry?.image?.url ? escapeXml(entry.image.url) : null;
    const lastMod = entry?.updatedAt;
    const loc = escapeXml(`${baseUrl}/${resource}s/${handle}`);
    const lastmod = lastMod ? `<lastmod>${escapeXml(lastMod)}</lastmod>` : '';

    const imageTag = image
      ? `<image:image>
           <image:loc>${image}</image:loc>
           <image:title>${
             entry?.altTxt ? escapeXml(entry.altTxt) : ''
           }</image:title>
         </image:image>`
      : '';

    return `
      <url>
        <loc>${loc}</loc>
        ${lastmod}
        <changefreq>daily</changefreq>
        ${imageTag}
      </url>
    `;
  };
}

async function fetchPagedResource({
  baseUrl,
  from = null,
  pageSize = 250,
  query,
  resource,
  storefront,
}: {
  baseUrl: string;
  from: string | null;
  pageSize?: number;
  query: string;
  resource: Resource;
  storefront: Storefront;
}) {
  const startCursor = from;
  const all: Array<Product | Page | Collection | Blog> = [];
  const data = await storefront.query(query, {
    variables: {
      first: pageSize,
      startCursor,
    },
  });

  const page = data?.[resource] as ResourceConnection;

  if (typeof page === 'undefined') {
    throw new Error(`Resource ${resource} not found`);
  }

  if (page?.nodes && page.pageInfo) {
    const nodes = page.nodes.map(toUrlTag(baseUrl));
    return [...all, ...nodes];
  }
  return all;
}

const PAGES_QUERY = `#graphql
  query PagesSitemapPage(
    $country: CountryCode
    $first: Int
    $language: LanguageCode
    $startCursor: String
  )
  @inContext(language: $language, country: $country) {
    pages(
      first: $first,
      after: $startCursor,
      query: "published_status:'published'") {
      nodes {
        handle
        __typename
        updatedAt
      }
      pageInfo {
        startCursor
        hasNextPage
        endCursor
      }
    }
  }
` as const;

const PRODUCTS_QUERY = `#graphql
  query ProductSitemapPage(
    $country: CountryCode
    $first: Int
    $language: LanguageCode
    $startCursor: String
  )
  @inContext(language: $language, country: $country) {
    products(
      first: $first,
      after: $startCursor,
      query: "published_status:'online_store:visible'"
    ) {
      nodes {
        handle
        __typename
        updatedAt
        image: featuredImage {
          url
          altText
        }
      }
      pageInfo {
        startCursor
        hasNextPage
        endCursor
      }
    }
  }
` as const;

const COLLECTIONS_QUERY = `#graphql
  query CollectionSitemapPage(
    $country: CountryCode
    $first: Int
    $language: LanguageCode
    $startCursor: String
  )
  @inContext(language: $language, country: $country) {
    collections(
      first: $first,
      after: $startCursor,
      query: "published_status:'online_store:visible'"
    ) {
      nodes {
        handle
        __typename
        updatedAt
        image {
          url
          altText
        }
      }
      pageInfo {
        startCursor
        hasNextPage
        endCursor
      }
    }
  }
` as const;

const BLOGS_QUERY = `#graphql
  query BlogSitemapPage(
    $country: CountryCode
    $first: Int
    $language: LanguageCode
    $startCursor: String
  )
  @inContext(language: $language, country: $country) {
    blogs(
      first: $first,
      after: $startCursor,
      query: "published_status:'online_store:visible'"
    ) {
      nodes {
        handle
        __typename
      }
      pageInfo {
        startCursor
        hasNextPage
        endCursor
      }
    }
  }
` as const;

const QUERY = {
  products: PRODUCTS_QUERY,
  pages: PAGES_QUERY,
  collections: COLLECTIONS_QUERY,
  blogs: BLOGS_QUERY,
};
