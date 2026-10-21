import type { Middleware } from "remix/router";

import { assets } from "../assets.ts";

/** Serves compiled browser modules and stylesheets from the asset server under `/assets/`. */
export function browserAssets(): Middleware {
  return async (context, next) => {
    if (!context.url.pathname.startsWith("/assets/")) return next();
    return (await assets.fetch(context.request)) ?? new Response("Not Found", { status: 404 });
  };
}
