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
} from "@remix-run/react";
import { Layout } from "~/components";
import { getCart, getLayoutData } from "~/data";
import { getSession } from "./lib/session.server";

import styles from "./styles/app.css";

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

export const loader: LoaderFunction = async function loader({
  request,
  context,
}) {
  const session = await getSession(request, context);
  const cartId = await session.get("cartId");

  return defer({
    layout: await getLayoutData(),
    cart: cartId ? getCart({ cartId }) : undefined,
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
