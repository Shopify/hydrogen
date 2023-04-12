import {flattenConnection} from '@shopify/hydrogen';
import type {LoaderArgs, ErrorBoundaryComponent} from '@shopify/remix-oxygen';
import {useCatch, useRouteError, isRouteErrorResponse} from '@remix-run/react';
import {
  CollectionConnection,
  PageConnection,
  ProductConnection,
} from '@shopify/hydrogen/storefront-api-types';

const MAX_URLS = 250; // the google limit is 50K, however, SF API only allow querying for 250 resources each time

interface SitemapQueryData {
  products: ProductConnection;
  collections: CollectionConnection;
  pages: PageConnection;
}

interface ProductEntry {
  url: string;
  lastMod: string;
  changeFreq: string;
  image?: {
    url: string;
    title?: string;
    caption?: string;
  };
}

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const data = await storefront.query<SitemapQueryData>(SITEMAP_QUERY, {
    variables: {
      urlLimits: MAX_URLS,
      language: storefront.i18n.language,
    },
  });

  if (!data) {
    throw new Response('No data found', {status: 404});
  }

  return new Response(
    shopSitemap({data, baseUrl: new URL(request.url).origin}),
    {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'content-type': 'application/xml',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'cache-control': `max-age=${60 * 60 * 24}`,
      },
    },
  );
}

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

function xmlEncode(string: string) {
  return string.replace(/[&<>'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function shopSitemap({
  data,
  baseUrl,
}: {
  data: SitemapQueryData;
  baseUrl: string;
}) {
  const productsData = flattenConnection(data.products)
    .filter((product) => product.onlineStoreUrl)
    .map((product) => {
      const url = `${baseUrl}/products/${xmlEncode(product.handle)}`;

      const finalObject: ProductEntry = {
        url,
        lastMod: product.updatedAt,
        changeFreq: 'daily',
      };

      if (product.featuredImage?.url) {
        finalObject.image = {
          url: xmlEncode(product.featuredImage.url),
        };

        if (product.title) {
          finalObject.image.title = xmlEncode(product.title);
        }

        if (product.featuredImage.altText) {
          finalObject.image.caption = xmlEncode(product.featuredImage.altText);
        }
      }

      return finalObject;
    });

  const collectionsData = flattenConnection(data.collections)
    .filter((collection) => collection.onlineStoreUrl)
    .map((collection) => {
      const url = `${baseUrl}/collections/${collection.handle}`;

      return {
        url,
        lastMod: collection.updatedAt,
        changeFreq: 'daily',
      };
    });

  const pagesData = flattenConnection(data.pages)
    .filter((page) => page.onlineStoreUrl)
    .map((page) => {
      const url = `${baseUrl}/pages/${page.handle}`;

      return {
        url,
        lastMod: page.updatedAt,
        changeFreq: 'weekly',
      };
    });

  const urlsDatas = [...productsData, ...collectionsData, ...pagesData];

  return `
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    >
      ${urlsDatas.map((url) => renderUrlTag(url)).join('')}
    </urlset>`;
}

function renderUrlTag({
  url,
  lastMod,
  changeFreq,
  image,
}: {
  url: string;
  lastMod?: string;
  changeFreq?: string;
  image?: {
    url: string;
    title?: string;
    caption?: string;
  };
}) {
  return `
    <url>
      <loc>${url}</loc>
      <lastmod>${lastMod}</lastmod>
      <changefreq>${changeFreq}</changefreq>
      ${
        image
          ? `
        <image:image>
          <image:loc>${image.url}</image:loc>
          <image:title>${image.title ?? ''}</image:title>
          <image:caption>${image.caption ?? ''}</image:caption>
        </image:image>`
          : ''
      }

    </url>
  `;
}

const SITEMAP_QUERY = `#graphql
  query sitemaps($urlLimits: Int, $language: LanguageCode)
  @inContext(language: $language) {
    products(
      first: $urlLimits
      query: "published_status:'online_store:visible'"
    ) {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
          title
          featuredImage {
            url
            altText
          }
        }
      }
    }
    collections(
      first: $urlLimits
      query: "published_status:'online_store:visible'"
    ) {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
        }
      }
    }
    pages(first: $urlLimits, query: "published_status:'published'") {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
        }
      }
    }
  }
`;
