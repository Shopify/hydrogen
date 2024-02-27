// NOTE: https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps
// You can submit up to 500 sitemap index files for each site in your Search Console account.
import type {
  BlogConnection,
  CollectionConnection,
  Maybe,
  PageConnection,
  ProductConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {Storefront} from '@shopify/hydrogen';
import type {LoaderArgs} from '@shopify/remix-oxygen';

type FromPageSize = {from: Maybe<string> | undefined; pageSize: number};
export type Resource = 'blogs' | 'pages' | 'products' | 'collections';
export type ResourceConnection =
  | PageConnection
  | ProductConnection
  | BlogConnection
  | CollectionConnection
  | undefined;

const pageSize = {
  blogs: 250,
  pages: 250,
  products: 250,
  collections: 250,
};

export async function loader({context, request}: LoaderArgs) {
  const {storefront, env} = context;

  // Ensure that we use the unrate-limited private API token e.g shpat_.....
  // NOTE: https://shopify.dev/docs/api/usage/authentication#getting-started-with-authenticated-access
  if (env.PRIVATE_STOREFRONT_API_TOKEN === undefined) {
    throw new Error('Missing PRIVATE_STOREFRONT_API_TOKEN');
  }

  const baseUrl = `${new URL(request.url).origin}/`;

  const blogsPromise = fetchPaginatedResource({
    pageSize: pageSize.blogs,
    query: BLOGS_QUERY,
    resource: 'blogs',
    storefront,
  });

  const collectionsPromise = fetchPaginatedResource({
    pageSize: pageSize.collections,
    query: COLLECTIONS_QUERY,
    resource: 'collections',
    storefront,
  });

  const pagesPromise = fetchPaginatedResource({
    pageSize: pageSize.pages,
    query: PAGES_QUERY,
    resource: 'pages',
    storefront,
  });

  const productsPromise = fetchPaginatedResource({
    pageSize: pageSize.products,
    query: PRODUCTS_QUERY,
    resource: 'products',
    storefront,
  });

  const [_blogs, _collections, _pages, _products] = await Promise.all([
    blogsPromise,
    collectionsPromise,
    pagesPromise,
    productsPromise,
  ]);

  const blogs = generateSitemaps({
    baseUrl,
    resource: 'blogs',
    entries: _blogs,
  });

  const collections = generateSitemaps({
    baseUrl,
    resource: 'collections',
    entries: _collections,
  });

  const pages = generateSitemaps({
    baseUrl,
    resource: 'pages',
    entries: _pages,
  });

  const products = generateSitemaps({
    baseUrl,
    resource: 'products',
    entries: _products,
  });

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${blogs.join('')}
      ${pages.join('')}
      ${products.join('')}
      ${collections.join('')}
    </sitemapindex>
  `;

  return new Response(sitemapIndex, {
    headers: {'content-type': 'application/xml; charset=utf-8'},
  });
}

/**
 * Fetch all paginated pageInfos for a given resource
 * @example
 * ```js
 * const _products = await fetchPaginatedResource({
 *   pageSize: 250,
 *   query: PRODUCTS_QUERY,
 *   resource: 'products',
 *   storefront,
 *   });
 * ```
 **/
export async function fetchPaginatedResource({
  pageSize = 250,
  query,
  resource,
  storefront,
  variables = {
    startCursor: null,
  },
}: {
  pageSize?: number;
  query: string;
  resource: Resource;
  storefront: Storefront;
  variables?: {
    startCursor: string | null;
  };
}) {
  let hasNextPage = true;
  let startCursor = variables.startCursor;
  let entries: Array<FromPageSize> = [];

  // TODO: hadle errors and throttling/rate limiting
  // TODO: ensure that this is only executed when the server API token is present
  do {
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
      entries = [...entries, {from: page.pageInfo.startCursor, pageSize}];
    }

    hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
    if (hasNextPage && page?.pageInfo?.endCursor) {
      startCursor = page.pageInfo.endCursor;
    }
  } while (hasNextPage);

  return entries;
}

/**
 * Generate a <sitemap> element for each paginated resource page
 * @example
 * ```js
 *   const productsSitemaps = generateSitemaps({
 *    baseUrl,
 *    resource: 'products',
 *    entries: _products,
 *  });
 *  ```
 */
function generateSitemaps({
  baseUrl,
  resource,
  entries,
}: {
  baseUrl: string;
  resource: Resource;
  entries: Array<FromPageSize>;
}) {
  return entries.map(({from, pageSize}, index) => {
    let url;
    if (entries.length === 1 || index === 0) {
      url = escapeXml(
        `${baseUrl}sitemap/${resource}_1.xml?pageSize=${pageSize}`,
      );
    } else {
      url = escapeXml(
        `${baseUrl}sitemap/${resource}_${
          index + 1
        }.xml?from=${from}&pageSize=${pageSize}`,
      );
    }
    return `<sitemap><loc>${url}</loc></sitemap>`;
  });
}

/**
 * Escape XML characters
 * @example
 * ```js
 * const escaped = escapeXml('<>&\'"');
 * ```
 **/
export function escapeXml(unsafe: string) {
  function escapeChar(char: string): string {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
    }
    return char;
  }
  if (typeof unsafe !== 'string') return String(unsafe);
  return unsafe.replace(/[<>&'"]/g, escapeChar);
}

const PAGES_QUERY = `#graphql
  query PagesSitemap(
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
  query ProductsSitemap(
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
  query CollectionsSitemap(
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
  query BlogsSitemap(
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
      }
      pageInfo {
        startCursor
        hasNextPage
        endCursor
      }
    }
  }
` as const;

// NOTE: this could be a new storefront api endpoint
// that would provide the correct sitemap indexing data
const SITEMAP_INDEX_QUERY = `#grapqhql
 query SitemapIndex {
   sitemap {
     products(pageSize: 250) {
        nodes {
          __typename # to be used for resource "products"
          pageNumber # to be used for subsitemap index
          startCursor # to be used for from
          endCursor # to be used for to
          updatedAt # to be used for lastmod
        }
     }
     pages(pageSize: 250) {
        nodes {
          __typename
          pageNumber
          startCursor
          endCursor
          updatedAt
        }
     }
     collections(pageSize: 250) {
        nodes {
          __typename
          pageNumber
          startCursor
          endCursor
          updatedAt
        }
     }
     blogs(pageSize: 250) {
        nodes {
          __typename
          pageNumber
          startCursor
          endCursor
          updatedAt
        }
     }
     metaobjects(pageSize: 250) {
       ...
     }
   }
 }
` as const;
