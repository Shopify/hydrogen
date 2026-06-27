import { setRouteData } from "../../lib/storefront";

export const GET = (async (context, next) => {
  setRouteData(context, {}, "Not found — Mock.shop");
  const response = await next();
  return new Response(response.body, {
    headers: response.headers,
    status: 404,
    statusText: "Not Found",
  });
}) satisfies MarkoRun.GET;

export const POST = (() => {
  return new Response(null, { status: 404, statusText: "Not Found" });
}) satisfies MarkoRun.POST;
