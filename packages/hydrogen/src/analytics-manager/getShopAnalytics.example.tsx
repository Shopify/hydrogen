import {UNSTABLE_Analytics, getShopAnalytics} from '@shopify/hydrogen';
import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Outlet, useLoaderData} from '@remix-run/react';

export async function loader({context}: LoaderFunctionArgs) {
  const {cart, env} = context;
  const cartPromise = cart.get();

  return defer({
    cart: cartPromise,
    shop: getShopAnalytics({
      storefront: context.storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body>
        <UNSTABLE_Analytics.Provider
          cart={data.cart}
          shop={data.shop}
          consent={data.consent}
        >
          <Outlet />
        </UNSTABLE_Analytics.Provider>
      </body>
    </html>
  );
}
