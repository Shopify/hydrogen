import { createElement, type RemixNode } from "remix/component";
import { Renderer } from "remix/middleware/render";
import type { Middleware } from "remix/router";

import { ErrorPage } from "../ui/error-pages.tsx";

/**
 * An error boundary. Actions throw a `Response` (such as a redirect) to stop early;
 * anything else is unexpected, so it's logged and rendered as a branded 500 page.
 *
 * The router uses it twice: innermost, so errors become responses before the session
 * and Shopify middleware finish, and outermost, for failures in those middleware.
 */
export function errorPages(): Middleware {
  return async (context, next) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof Response) return error;
      if (context.request.signal.aborted && error === context.request.signal.reason) throw error;

      console.error(error);
      // SAFETY: The app renderer runs before this middleware; Remix's generic
      // `Renderer` key erases its input type.
      const renderPage = context.get(Renderer) as (
        node: RemixNode,
        init?: ResponseInit,
      ) => Promise<Response>;
      return renderPage(createElement(ErrorPage, {}), { status: 500 });
    }
  };
}
