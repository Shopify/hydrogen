import type {Route} from './+types/_index';
import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import {LANDING_PAGES_QUERY} from '~/sanity/queries';
import type {SanityDocument} from '@sanity/client';
import LandingPageContent from '~/components/LandingPageContent';
import {Link} from 'react-router-dom';

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    {title: 'New React Router App'},
    {name: 'description', content: 'Welcome to React Router!'},
  ];
}

export async function loader({context}: Route.LoaderArgs) {
  const {storefront, sanity, cloudflare} = context;

  const landingPageContent = await sanity.fetch(LANDING_PAGES_QUERY);

  const featuredCollection = await getFeaturedCollection(
    storefront,
    cloudflare.ctx,
  );
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    featuredCollection,
    landingPageContent,
  };
}

export default function Home({loaderData}: Route.ComponentProps) {
  const products =
    loaderData.featuredCollection.data!.collection!.products.nodes;

  const landingPageContent = loaderData.landingPageContent;

  return (
    <div>
      <div className="text-center mt-4">
        <LandingPageContent landingPageContent={landingPageContent} />
        <h3>Featured Collection</h3>
        <p>{loaderData.featuredCollection.data?.collection?.title}</p>
        <img
          src={loaderData.featuredCollection.data?.collection?.image?.url}
          alt={loaderData.featuredCollection.data?.collection?.title}
          className="mb-8"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

type Product = {
  id: string;
  title: string;
  handle: string;
  images: {
    nodes: {
      id?: string | null;
      url: string;
      altText?: string | null;
    }[];
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
};

interface ProductCardProps {
  product: Product;
}

function ProductCard({product}: ProductCardProps) {
  const {title, images, priceRange, handle} = product;
  const image = images.nodes[0];
  const price = priceRange.minVariantPrice.amount;
  const currencyCode = priceRange.minVariantPrice.currencyCode;

  return (
    <Link
      to={`/products/${handle}`}
      className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {image && (
        <div className="aspect-square overflow-hidden">
          <img
            src={image.url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="mt-1 font-bold">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
          }).format(parseFloat(price))}
        </p>
      </div>
    </Link>
  );
}

async function getFeaturedCollection(
  storefront: StorefrontApiClient,
  ctx?: ExecutionContext,
) {
  const cacheKey = 'featured-collection-cache-key';
  const cache = caches.default; // Cloudflare's default cache

  // Try to get from cache first
  const cachedResponse = await cache.match(
    new Request(`https://shopify.dev/?${cacheKey}`),
  );

  if (cachedResponse) {
    try {
      // Return cached data if available
      const cachedData = await cachedResponse.json();

      // Check if the cache is stale (beyond the max-age of 1 second)
      const cacheDate = cachedResponse.headers.get('cache-put-date');
      const isStale = cacheDate && Date.now() - Number(cacheDate) > 1000; // 1 second

      // Still valid within stale-while-revalidate window (24 hours)
      const isWithinSWRWindow =
        cacheDate && Date.now() - Number(cacheDate) < 86400000; // 24 hours

      if (!isStale) {
        return cachedData;
      }

      // If stale but within SWR window, fetch in background and return cached data
      if (isWithinSWRWindow) {
        if (ctx) {
          // Use waitUntil to keep the worker alive for background refresh
          ctx.waitUntil(fetchAndCacheInBackground());
        } else {
          fetchAndCacheInBackground();
        }
        return cachedData;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
  }

  // Cache miss or expired SWR - fetch and cache the data
  return await fetchAndCache();

  async function fetchAndCache() {
    const featuredCollection = await storefront.request(
      FEATURED_COLLECTION_QUERY,
    );

    // Store in cache with 1 second freshness and 24 hour stale-while-revalidate
    const response = new Response(JSON.stringify(featuredCollection));
    response.headers.set(
      'cache-control',
      'public, max-age=1, stale-while-revalidate=86399',
    );
    response.headers.set('cache-put-date', String(Date.now()));

    await cache.put(
      new Request(`https://shopify.dev/?${cacheKey}`),
      response.clone(),
    );

    return featuredCollection;
  }

  async function fetchAndCacheInBackground() {
    // This runs in the background without blocking the response
    return fetchAndCache().catch((error) => {
      console.error('Background revalidation failed:', error);
    });
  }
}

const FEATURED_COLLECTION_QUERY = /* GraphQL */ `
  query FeaturedCollection {
    collection(handle: "featured") {
      id
      handle
      title
      description
      image {
        id
        url
      }
      products(first: 12) {
        nodes {
          id
          title
          handle
          images(first: 1) {
            nodes {
              id
              url
              altText
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;
