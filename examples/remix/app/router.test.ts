import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { getDocumentAssets } from "./assets.ts";
import { readEnv } from "./env.ts";
import { createStorefrontCache } from "./lib/storefront.ts";
import { createApp } from "./router.ts";
import { routes } from "./routes.ts";

const env = readEnv({
  PUBLIC_STORE_DOMAIN: "hydrogen-preview.myshopify.com",
  SESSION_SECRET: "test-session-secret",
  SHOP_ID: "1",
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "shp_test",
});
const documentAssets = await getDocumentAssets();

function fetchApp(path: string) {
  const app = createApp(
    { env, cache: createStorefrontCache(), buyerIp: "127.0.0.1" },
    documentAssets,
  );
  return app.fetch(new URL(path, "http://localhost"));
}

// These routes answer without calling the Storefront or Customer Account APIs.
describe("app router", () => {
  it("serves robots.txt with the sitemap URL and a day of caching", async () => {
    const response = await fetchApp(routes.seo.robots.href());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "max-age=86400");
    assert.match(await response.text(), /^Sitemap: http:\/\/localhost\/sitemap\.xml$/m);
  });

  it("sends anonymous account requests to Hydrogen's login handler", async () => {
    const response = await fetchApp(routes.account.orders.href());

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/account/login?return_to=%2Faccount%2Forders");
  });

  it("keeps the locale prefix on login redirects", async () => {
    const response = await fetchApp(`/fr-ca${routes.account.profile.href()}`);

    assert.equal(
      response.headers.get("Location"),
      "/fr-ca/account/login?return_to=%2Ffr-ca%2Faccount%2Fprofile",
    );
  });

  it("serves browser modules but not server modules", async () => {
    const browserModule = await fetchApp(documentAssets.scriptEntry.href);
    assert.equal(browserModule.status, 200);

    const serverModule = await fetchApp("/assets/app/lib/storefront.ts");
    assert.equal(serverModule.status, 404);
  });
});
