import { createElement } from "remix/component";
import { createCookie } from "remix/cookie";
import { compression } from "remix/middleware/compression";
import { logger } from "remix/middleware/logger";
import { session } from "remix/middleware/session";
import { staticFiles } from "remix/middleware/static";
import { createRouter, type RouterContext } from "remix/router";
import { createCookieSessionStorage } from "remix/session-storage/cookie";

import accountController from "./actions/account/controller.tsx";
import blogsController from "./actions/blogs/controller.tsx";
import collectionsController from "./actions/collections/controller.tsx";
import rootController from "./actions/controller.tsx";
import pagesController from "./actions/pages/controller.tsx";
import policiesController from "./actions/policies/controller.tsx";
import productsController from "./actions/products/controller.tsx";
import seoController from "./actions/seo/controller.ts";
import type { DocumentAssets } from "./assets.ts";
import type { Runtime } from "./env.ts";
import { browserAssets } from "./middleware/browser-assets.ts";
import { errorPages } from "./middleware/error-pages.ts";
import { layout } from "./middleware/layout.ts";
import { locale } from "./middleware/locale.ts";
import { render } from "./middleware/render.tsx";
import { runtime } from "./middleware/runtime.ts";
import { shopify, shopifyResponseHeaders } from "./middleware/shopify.ts";
import { routes } from "./routes.ts";
import { NotFoundPage } from "./ui/error-pages.tsx";

/**
 * Builds the app for one request. The buyer IP comes from the request's connection, so the
 * runtime values enter through middleware instead of module state.
 *
 * Middleware order matters:
 * - Request logging and response compression wrap everything.
 * - Static files and compiled browser assets are served first, without sessions or
 *   Hydrogen's personalized-response headers.
 * - The renderer and the outer error boundary wrap everything else.
 * - The locale prefix is resolved before routing.
 * - Hydrogen's response headers are applied outside the session, after its cookie is set.
 * - The session exists before Hydrogen's Customer Account handlers read or write it.
 * - The inner error boundary turns errors and thrown redirects from layout and actions
 *   into responses, so the session still saves and Hydrogen's headers still apply.
 */
function createAppRouter(runtimeValue: Runtime, documentAssets: DocumentAssets) {
  const sessionCookie = createCookie("session", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [runtimeValue.env.SESSION_SECRET],
  });

  return createRouter({
    middleware: [
      // Quiet under `remix test`, where request lines would interleave with test output.
      logger(process.env.NODE_ENV === "test" ? { log() {} } : {}),
      // Streams HTML with a flush after each chunk, so streaming still reaches the browser early.
      compression(),
      staticFiles("./public", { index: false }),
      browserAssets(),
      runtime(runtimeValue),
      ...render(documentAssets),
      errorPages(),
      locale(),
      shopifyResponseHeaders(),
      session(sessionCookie, createCookieSessionStorage()),
      shopify(),
      layout(),
      errorPages(),
    ],
    defaultHandler(context) {
      if (context.method !== "GET" && context.method !== "HEAD") {
        return new Response("Not Found", { status: 404 });
      }
      return context.render(createElement(NotFoundPage, { pathname: context.url.pathname }), {
        status: 404,
      });
    },
  });
}

type AppContext = RouterContext<ReturnType<typeof createAppRouter>>;

declare module "remix" {
  interface RouterTypes {
    context: AppContext;
  }
}

export function createApp(runtimeValue: Runtime, documentAssets: DocumentAssets) {
  const router = createAppRouter(runtimeValue, documentAssets);

  router.map(routes, rootController);
  router.map(routes.collections, collectionsController);
  router.map(routes.products, productsController);
  router.map(routes.blogs, blogsController);
  router.map(routes.pages, pagesController);
  router.map(routes.policies, policiesController);
  router.map(routes.account, accountController);
  router.map(routes.seo, seoController);

  return router;
}
