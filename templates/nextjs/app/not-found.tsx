import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getStorefrontClient } from "./lib/storefront";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const url = (await headers()).get("x-storefront-url");

  if (url) {
    const result = await handleShopifyRedirects({
      request: new Request(url),
      storefrontClient: await getStorefrontClient(),
    });
    const location = result?.headers.get("location");
    if (location) redirect(location);
  }

  return (
    <main id="main-content" tabIndex={-1} className="max-w-page px-margin mx-auto flex-1 py-16">
      <h1 className="type-display text-on-surface">Not found</h1>
      <p className="text-on-surface-secondary mt-4">We could not find that page.</p>
    </main>
  );
}
