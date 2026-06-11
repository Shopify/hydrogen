import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getStorefrontClient } from "./lib/storefront";

// Reading headers() and possibly redirecting must happen per-request.
export const dynamic = "force-dynamic";

export default async function NotFound() {
  const headersList = await headers();
  const url = headersList.get("x-storefront-url");

  if (url) {
    const result = await handleShopifyRedirects({
      request: new Request(url),
      storefrontClient: await getStorefrontClient(),
    });
    if (result) {
      const location = result.headers.get("location");
      if (location) redirect(location);
    }
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
      <Link href="/" className="underline">
        Return home
      </Link>
    </main>
  );
}
