import type { RedirectOptions } from "../handle-shopify-redirects";

export async function handleAdminRedirect({
  request,
  storefrontClient,
}: RedirectOptions): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/admin") return null;

  return new Response(null, {
    status: 301,
    headers: { location: new URL("/admin", storefrontClient.storeUrl).toString() },
  });
}
