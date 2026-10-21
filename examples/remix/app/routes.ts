import { get, post, route } from "remix/routes";

/**
 * The app's URL contract. Every route also matches under a locale prefix such as
 * `/en-ca`, because the locale middleware routes the prefix-free path.
 *
 * Shopify-owned routes (`/api/cart`, `/api/predictive-search`, `/account/login`,
 * `/account/authorize`, `/account/logout`, cart permalinks, and the Storefront API
 * proxy) are answered by `handleShopifyRoutes` before this router runs.
 */
export const routes = route({
  home: get("/"),
  cart: get("/cart"),
  search: get("/search"),
  discount: get("/discount/:code"),
  collections: {
    index: get("/collections"),
    all: get("/collections/all"),
    show: get("/collections/:handle"),
  },
  products: {
    show: get("/products/:handle"),
  },
  blogs: {
    index: get("/blogs"),
    show: get("/blogs/:blogHandle"),
    article: get("/blogs/:blogHandle/:articleHandle"),
  },
  pages: {
    show: get("/pages/:handle"),
  },
  policies: {
    index: get("/policies"),
    show: get("/policies/:handle"),
  },
  account: {
    index: get("/account"),
    orders: get("/account/orders"),
    order: get("/account/orders/:id"),
    profile: get("/account/profile"),
    updateProfile: post("/account/profile"),
    addresses: get("/account/addresses"),
    updateAddresses: post("/account/addresses"),
    // Static routes rank above wildcards, so this only matches unknown account paths.
    fallback: get("/account/*"),
  },
  seo: {
    robots: get("/robots.txt"),
    sitemapIndex: get("/sitemap.xml"),
    sitemap: get("/sitemap/:type/:page.xml"),
  },
});
