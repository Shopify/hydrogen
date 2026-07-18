import { index, rootRoute, route } from "@tanstack/virtual-file-routes";

export const routes = rootRoute("root.tsx", [
  index("routes/home.tsx"),
  route("/collections", "routes/collections.tsx"),
  route("/collections/$handle", "routes/collection.tsx"),
  route("/search", "routes/search.tsx"),
  route("/products/$handle", "routes/product.tsx"),
  route("/cart", "routes/cart.tsx"),
  route("/account", "routes/account.tsx"),
  route("/sitemap[.]xml", "routes/sitemap.tsx"),
  route("/robots[.]txt", "routes/robots.tsx"),
  route("/$", "routes/catchall.tsx"),
]);

export default routes;
