import type {Route} from './+types/_index';
import type {StorefrontApiClient} from '@shopify/storefront-api-client';

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    {title: 'New React Router App'},
    {name: 'description', content: 'Welcome to React Router!'},
  ];
}

export async function loader({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const featuredCollection = await getFeaturedCollection(storefront);
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    featuredCollection,
  };
}

// Define TypeScript interfaces for our data
interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

interface ProductPrice {
  amount: string;
  currencyCode: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  images: {
    nodes: ProductImage[];
  };
  priceRange: {
    minVariantPrice: ProductPrice;
  };
}

interface ProductCardProps {
  product: Product;
}

export default function Home({loaderData}: Route.ComponentProps) {
  const products: Product[] =
    loaderData.featuredCollection.data.collection.products.nodes;

  return (
    <div>
      <div className="text-center mt-4">
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
