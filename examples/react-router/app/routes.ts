import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("collections", "routes/collections.tsx"),
  route("collections/:handle", "routes/collection.tsx"),
  route("search", "routes/search.tsx"),
  route("products/:handle", "routes/product.tsx"),
  route("blogs/news", "routes/news.tsx"),
  route("blogs/news/:handle", "routes/article.tsx"),
  route("cart", "routes/cart.tsx"),
  // Catch-all so root middleware runs for every URL (e.g. /admin, /graphiql,
  // SFAPI proxy paths). Without this, React Router rejects unmatched URLs
  // before middleware fires and the interceptors never see them.
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
