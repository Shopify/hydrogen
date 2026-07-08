import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("collections", "routes/collections.tsx"),
  route("collections/:handle", "routes/collection.tsx"),
  route("search", "routes/search.tsx"),
  route("products/:handle", "routes/product.tsx"),
  route("cart", "routes/cart.tsx"),
  route("account", "routes/account.tsx"),
  route("sitemap.xml", "routes/sitemap.tsx"),
  route("robots.txt", "routes/robots.tsx"),
  // Catch-all so root middleware runs for every URL (e.g. /admin, /graphiql,
  // SFAPI proxy paths). Without this, React Router rejects unmatched URLs
  // before middleware fires and the interceptors never see them.
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
