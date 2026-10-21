import { initializeShopifyScripts, trackCartAnalytics } from "@shopify/hydrogen";
import { navigate, run } from "remix/component";
import {
  detectMultipleImportMapSupport,
  importModule,
  preloadShim,
} from "remix/multiple-import-maps-polyfill";

import { routeTemplates } from "../../lib/public/route-templates.ts";
import { createPageViewPublisher } from "./analytics.ts";
import { getCartStore } from "./cart-store.ts";

/** Hydrates every `clientEntry()` island and enhances same-origin links and forms. */
const app = run({
  async loadModule(moduleUrl, exportName) {
    const module = await importModule(moduleUrl);
    const component = module[exportName];
    if (typeof component !== "function") {
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`);
    }
    return component;
  },
  async processClientEntryPreloads(preloads) {
    if (await detectMultipleImportMapSupport()) return preloads;
    preloadShim(preloads);
    return [];
  },
});

app.addEventListener("error", (event) => {
  console.error("Hydration error:", event.error);
});

if (import.meta.hot) {
  // Under `pnpm hmr`, editing a server module re-renders the current page in place.
  import.meta.hot.on("server:update", async () => {
    try {
      await app.ready();
      await app.frames.top.reload();
    } catch (error) {
      console.error("Error reloading top frame on server update", error);
    }
  });
}

const publishPageViewed = createPageViewPublisher();
app.frames.top.addEventListener("reloadComplete", publishPageViewed);

await Promise.all([
  app.ready(),
  initializeShopifyScripts({
    routes: routeTemplates,
    // Shopify's scripts resolve storefront URLs, then navigate through the Remix runtime.
    navigate: (url) => void navigate(url),
  }),
]);

publishPageViewed();

// Islands create the cart store as they hydrate; this only reads it.
const cartStore = getCartStore(undefined, document.documentElement.dataset.pathPrefix ?? "");
if (cartStore && window.Shopify?.analytics) trackCartAnalytics(cartStore);
