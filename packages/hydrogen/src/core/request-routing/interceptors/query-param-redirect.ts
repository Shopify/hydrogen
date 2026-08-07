export function handleQueryParamRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("return_to") || url.searchParams.get("redirect");

  if (!redirectTo) return null;
  if (!isSameOrigin(request.url, redirectTo)) return null;

  return new Response(null, {
    status: 301,
    headers: { location: redirectTo },
  });
}

function isSameOrigin(requestUrl: string, redirectUrl: string): boolean {
  try {
    return new URL(requestUrl).origin === new URL(redirectUrl, requestUrl).origin;
  } catch {
    return false;
  }
}
