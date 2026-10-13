import { getSameOriginPath } from "../../url";

export function handleQueryParamRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const location = getSameOriginPath(
    url.searchParams.get("return_to") || url.searchParams.get("redirect"),
    url.origin,
  );

  if (!location) return null;

  return new Response(null, {
    status: 301,
    headers: { location },
  });
}
