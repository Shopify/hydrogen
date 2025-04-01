import type {Route} from './+types/home';
import {createClient, getShopDetails} from '../lib/shopify';

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    {title: 'New React Router App'},
    {name: 'description', content: 'Welcome to React Router!'},
  ];
}

export async function loader({context}: Route.LoaderArgs) {
  const shopData = await getShopDetails(context.cloudflare.env);
  const featuredCollection = await getFeaturedCollection(
    context.cloudflare.env,
  );
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    shopName: shopData.shop.name,
    featuredCollection,
  };
}

export default function Home({loaderData}: Route.ComponentProps) {
  console.log(loaderData);
  return (
    <div>
      <div className="text-center mt-4">
        <h2 className="text-xl font-bold">Shop Name: {loaderData.shopName}</h2>
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

async function getFeaturedCollection(env: CloudflareEnvironment) {
  const client = createClient(env);
  const featuredCollection = await client.request(
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
