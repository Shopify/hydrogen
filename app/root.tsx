import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  defer,
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
import { getLayoutData, getCountries } from "~/data";

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

export const loader: LoaderFunction = async function loader() {
  return defer({
    layoutData: await getLayoutData(),
    defaultCountry: await ({
      currency: {
        isoCode: "USD",
        symbol: "$",
      },
      isoCode: "US",
      name: "United States"
    }),
    countries: getCountries(),
  })
};

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={data}>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
