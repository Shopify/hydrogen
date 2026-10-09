import { loadHome } from "../lib/loaders";

export const GET = Run.GET((context, next) => {
  return next({
    pageTitle: "Mock.shop — Hydrogen",
    home: loadHome(context),
  });
});
