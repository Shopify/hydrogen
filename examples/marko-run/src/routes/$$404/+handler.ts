export const GET = Run.GET(async (_context, next) => {
  const response = await next({ pageTitle: "Not found — Mock.shop" });
  return new Response(response.body, {
    headers: response.headers,
    status: 404,
    statusText: "Not Found",
  });
});

export const POST = Run.POST(() => {
  return new Response(null, { status: 404, statusText: "Not Found" });
});
