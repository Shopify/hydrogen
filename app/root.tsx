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
  useCatch,
  useLoaderData,
  useMatches,
} from "@remix-run/react";
import { Layout } from "~/components";
import { getCart, getLayoutData, getCountries } from "~/data";
import { GenericError } from "./components/GenericError";
import { NotFound } from "./components/NotFound";
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
  params
}) {
  const session = await getSession(request, context);
  const cartId = await session.get("cartId");

  return defer({
    layout: await getLayoutData(params),
    countries: getCountries(),
    cart: cartId ? getCart({ cartId, params }) : undefined,
  });
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

export function CatchBoundary() {
  const [root] = useMatches();
  const caught = useCatch();
  const isNotFound = caught.status === 404;

  return (
    <html lang="en">
      <head>
        <title>{isNotFound ? "Not found" : "Error"}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={root.data as any}>
          {isNotFound ? (
            <NotFound type={caught.data?.pageType} />
          ) : (
            <GenericError
              error={{ message: `${caught.status} ${caught.data}` }}
            />
          )}
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  const [root] = useMatches();

  return (
    <html lang="en">
      <head>
        <title>Error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={root.data as any}>
          <GenericError error={error} />
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}
