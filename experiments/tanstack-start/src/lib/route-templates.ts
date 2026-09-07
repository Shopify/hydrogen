import { createShopifyRouteTemplates } from "@shopify/hydrogen";

// Canonicalize Shopify's collection-scoped product route to the product page this project handles.
// Add entries here if this project changes to custom product, collection, page, blog, or article paths.
export const routeTemplates = createShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});

// App-owned path builders. Hydrogen does not export `getStandardRoute` from its
// root entry, so the not-found/redirect resolver rebuilds storefront paths from
// validated route params instead of reading them off the request.
export const NEWS_BLOG_HANDLE = "news";

export function productPath(handle: string): string {
  return `/products/${encodeURIComponent(handle)}`;
}

export function collectionPath(handle: string): string {
  return `/collections/${encodeURIComponent(handle)}`;
}

export function newsPath(): string {
  return `/blogs/${NEWS_BLOG_HANDLE}`;
}

export function articlePath(handle: string): string {
  return `${newsPath()}/${encodeURIComponent(handle)}`;
}
