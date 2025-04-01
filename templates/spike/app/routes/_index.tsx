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

export default function Home({loaderData}: Route.ComponentProps) {
  return (
    <div>
      <div className="text-center mt-4">
        <h3>Featured Collection</h3>
        <p>{loaderData.featuredCollection.data.collection.title}</p>
        <img
          src={loaderData.featuredCollection.data.collection.image.url}
          alt={loaderData.featuredCollection.data.collection.title}
        />
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
        }
      }
    `,
  );
  return featuredCollection;
}
