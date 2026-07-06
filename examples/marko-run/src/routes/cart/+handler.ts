export const GET = Run.GET((_context, next) => {
  return next({ pageTitle: "Cart — Mock.shop" });
});
