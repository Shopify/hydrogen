import { handleShopifyRedirects } from "@shopify/hydrogen";
import { query, redirect, type RouteDefinition } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { getRequestEvent } from "solid-js/web";

// Catch-all route — the framework only renders this when nothing else matches,
// which is the same gate the other framework examples use to call
// `handleShopifyRedirects` (`response.status === 404`). Running the redirect lookup
// here keeps the Storefront API URL-redirects fetch off the hot path for
// matched routes.
const lookupRedirect = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (!event) return null;
  const { storefrontClient } = event.locals;
  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }
  const result = await handleShopifyRedirects({
    request: event.request,
    storefrontClient,
  });
  if (!result) return null;
  const location = result.headers.get("location");
  if (location) throw redirect(location, result.status);
  return null;
}, "storefront-redirect");

export const route = {
  preload: () => lookupRedirect(),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <>
      <HttpStatusCode code={404} />
      <main class="flex min-h-screen items-center justify-center p-8">
        <div class="text-center">
          <h1 class="text-3xl font-bold">404</h1>
          <p class="mt-2 text-gray-600">Not found.</p>
        </div>
      </main>
    </>
  );
}
