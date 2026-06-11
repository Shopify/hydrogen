import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";
import type { Route } from "./+types/root";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { CartProvider } from "./lib/cart";
import { cartHandlers } from "./lib/cart-handlers";
import {
  createRequestStorefrontClient,
  storefrontClientContext,
  storefrontRequestContext,
} from "./lib/storefront";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const storefrontClient = createRequestStorefrontClient(request);
    const kitRoute = await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [cartHandlers],
    });
    if (kitRoute) return kitRoute;

    context.set(storefrontRequestContext, storefrontClient.requestContext);
    context.set(storefrontClientContext, storefrontClient);

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({
        request,
        storefrontClient,
      });
      if (redirect) {
        return applyStorefrontResponseHeaders(storefrontClient.requestContext, redirect);
      }
    }
    return applyStorefrontResponseHeaders(storefrontClient.requestContext, response);
  },
];

function applyStorefrontResponseHeaders(
  requestContext: { applyResponseHeaders(headers: Headers): void },
  response: Response,
): Response {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutableResponse = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutableResponse.headers);
    return mutableResponse;
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const [{ data: cartData }, { data: headerData }] = await Promise.all([
    cartHandlers.get({ storefrontClient }),
    storefrontClient.graphql(HEADER_COLLECTIONS_QUERY),
  ]);
  return {
    cart: cartData.cart,
    headerCollections: normalizeHeaderCollections(headerData?.collections?.nodes),
  };
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          type="module"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-white text-black">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cart}>
      <Header collections={loaderData.headerCollections} />
      <AnalyticsTracker />
      <Outlet />
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
