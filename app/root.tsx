import {
  defer,
  type LinksFunction,
  type LoaderFunction,
  type MetaFunction,
} from "@remix-run/cloudflare";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type ShouldReloadFunction,
} from "@remix-run/react";
import { Layout } from "~/components";
import { getCart, _getCartUpdate, _getLayoutData } from "~/data";
import { getSession } from "./lib/session.server";
import memoizee from 'memoizee';

import styles from "./styles/app.css";

const getLayoutData = memoizee(_getLayoutData, { promise: true, maxAge: 1_000 * 3_600 })

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: styles },
    {
      rel: "preconnect",
      href: "https://cdn.shopify.com",
    },
    {
      rel: "preconnect",
      href: "https://shop.app",
    },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Hydrogen",
  viewport: "width=device-width,initial-scale=1",
});

export const unstable_shouldReload: ShouldReloadFunction = ({
  // same params that go to `loader` and `action`
  params,

  // a possible form submission that caused this to be reloaded
  submission,

  // the next URL being used to render this page
  url,

  // the previous URL used to render this page
  prevUrl,
}) => {
  console.log("Should reload?", submission, window)
  const isAddToCart = submission?.action?.includes('/products/')
  console.log({isAddToCart})
  return isAddToCart || false
}

export const loader: LoaderFunction = async function loader({
  request,
  context,
}) {
  const session = await getSession(request, context);
  const cartId = await session.get("cartId");

  return defer({
    layout: await getLayoutData(),
    cartUpdatedAt: cartId
      ? _getCartUpdate({ cartId })
      : undefined,
    cart: cartId
      ? getCart({ cartId })
      : undefined,
  });
};

export default function App() {
  const layoutData = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={layoutData}>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
