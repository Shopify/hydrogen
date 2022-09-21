import {json} from "@remix-run/cloudflare";
import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction
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
import { getLayoutData as _getLayoutData } from "~/data";
import memoize from "memoizee";
import styles from "./styles/app.css";
const getLayoutData = memoize(_getLayoutData);

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

export const loader: LoaderFunction = async function loader() {
  // TODO: maybe split queries and defer footer menu
  const layoutData = await getLayoutData();
  return json({
    ...layoutData,
  })
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
