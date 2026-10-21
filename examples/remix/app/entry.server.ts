import { getDocumentAssets } from "./assets.ts";
import type { Env } from "./env.ts";
import { createApp } from "./router.ts";

const documentAssets = await getDocumentAssets();

/** The Oxygen Worker. MiniOxygen runs this same module for `vite dev` and `vite preview`. */
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const app = createApp(
        {
          env,
          cache: await caches.open("hydrogen"),
          waitUntil: executionContext.waitUntil.bind(executionContext),
        },
        documentAssets,
      );
      return await app.fetch(toPublicRequest(request));
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};

/**
 * Behind a proxy that terminates TLS, such as a tunnel, the Worker sees `http:` with
 * `x-forwarded-proto: https`. Customer Account OAuth needs the public `https:` origin.
 */
function toPublicRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.protocol !== "http:" || request.headers.get("x-forwarded-proto") !== "https") {
    return request;
  }
  url.protocol = "https:";
  return new Request(url, request);
}

if (import.meta.hot) import.meta.hot.accept();
