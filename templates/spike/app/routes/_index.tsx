import type {Route} from './+types/_index';
import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import {LANDING_PAGES_QUERY} from '~/sanity/queries';
import type {SanityDocument} from '@sanity/client';
import LandingPageContent from '~/components/LandingPageContent';
import type {Product} from '~/graphql-types/storefront.types';

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    {title: 'New React Router App'},
    {name: 'description', content: 'Welcome to React Router!'},
  ];
}

export async function loader({context}: Route.LoaderArgs) {
  const {storefront, sanity} = context;

  const landingPageContent = await sanity.fetch(LANDING_PAGES_QUERY);

  const featuredCollection = await getFeaturedCollection(storefront);
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    featuredCollection,
    landingPageContent,
  };
}

export default function Home({loaderData}: Route.ComponentProps) {
  const products: Product[] =
    loaderData.featuredCollection.data.collection.products.nodes;

  const landingPageContent = loaderData.landingPageContent;

  return (
    <div>
      <div className="text-center mt-4">
        <LandingPageContent landingPageContent={landingPageContent} />
        <h3>Featured Collection</h3>
        <p>{loaderData.featuredCollection.data.collection.title}</p>
        <img
          src={loaderData.featuredCollection.data.collection.image.url}
          alt={loaderData.featuredCollection.data.collection.title}
          className="mb-8"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
}

function ProductCard({product}: ProductCardProps) {
  const {title, images, priceRange} = product;
  const image = images.nodes[0];
  const price = priceRange.minVariantPrice.amount;
  const currencyCode = priceRange.minVariantPrice.currencyCode;

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
    </div>
  );
}

async function getFeaturedCollection(storefront: StorefrontApiClient) {
  const featuredCollection = await storefront.request(
    `#graphql
      {
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
    `,
  );
  return featuredCollection;
}
