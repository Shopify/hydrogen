import type {Route} from './+types/home';
import {getShopDetails} from '../lib/shopify';

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    {title: 'New React Router App'},
    {name: 'description', content: 'Welcome to React Router!'},
  ];
}

export async function loader({context}: Route.LoaderArgs) {
  const shopData = await getShopDetails(context.cloudflare.env);
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    shopName: shopData.shop.name,
  };
}

export default function Home({loaderData}: Route.ComponentProps) {
  return (
    <div>
      <div className="text-center mt-4">
        <h2 className="text-xl font-bold">Shop Name: {loaderData.shopName}</h2>
      </div>
    </div>
  );
}
