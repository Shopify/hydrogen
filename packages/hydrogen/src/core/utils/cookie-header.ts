/** Parses a `Cookie` header into raw values by name. The first value wins when a name repeats. */
export function parseCookieHeader(cookieHeader: string | null | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    if (!cookies.has(name)) cookies.set(name, cookie.slice(separator + 1));
  }

  return cookies;
}
