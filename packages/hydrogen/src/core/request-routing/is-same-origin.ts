export function isSameOriginRequest(
  request: Request,
  trustedOrigin = new URL(request.url).origin,
): boolean {
  // An invalid Origin must not fall back to a more permissive Referer.
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;

  try {
    const url = new URL(source);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === trustedOrigin;
  } catch {
    return false;
  }
}
