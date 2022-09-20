import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
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
import {
  getPublicTokenHeaders,
  getStorefrontApiUrl,
} from "./lib/shopify-client";
import invariant from "tiny-invariant";

import styles from "./styles/app.css";
import { StorefrontApiResponseOk } from "@shopify/hydrogen-ui-alpha/dist/types/storefront-api-response.types";
import { Menu, Shop } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { parseMenu } from "./lib/utils";

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
  const languageCode = "EN";

  const HEADER_MENU_HANDLE = "main-menu";
  const FOOTER_MENU_HANDLE = "footer";

  const headers = getPublicTokenHeaders();
  headers["content-type"] = "application/json";

  const response = await fetch(getStorefrontApiUrl(), {
    body: JSON.stringify({
      query: LAYOUT_QUERY,
      variables: {
        language: languageCode,
        headerMenuHandle: HEADER_MENU_HANDLE,
        footerMenuHandle: FOOTER_MENU_HANDLE,
      },
    }),
    headers,
    method: "POST",
  });

  const json: StorefrontApiResponseOk<{
    headerMenu: Menu;
    footerMenu: Menu;
    shop: Shop;
  }> = await response.json();

  invariant(json && json.data, "No data returned from Shopify API");

  const { data } = json;

  /*
    Modify specific links/routes (optional)
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    e.g here we map:
      - /blogs/news -> /news
      - /blog/news/blog-post -> /news/blog-post
      - /collections/all -> /products
  */
  const customPrefixes = { BLOG: "", CATALOG: "products" };

  const headerMenu = data?.headerMenu
    ? parseMenu(data.headerMenu, customPrefixes)
    : undefined;

  const footerMenu = data?.footerMenu
    ? parseMenu(data.footerMenu, customPrefixes)
    : undefined;

  return { shop: data.shop, headerMenu, footerMenu };
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

const LAYOUT_QUERY = `
  query layoutMenus(
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language) {
    shop {
      name
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
  }
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
`;
