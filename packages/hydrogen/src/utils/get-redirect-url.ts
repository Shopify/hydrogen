/**
 * Returns the `return_to` or `redirect` search param of `requestUrl`, normalized
 * by `getSameOriginPath`. `origin` defaults to the origin of `requestUrl`.
 */
export function getRedirectUrl(
  requestUrl?: string,
  origin?: string,
): string | undefined {
  if (!requestUrl) return;

  const url = new URL(requestUrl);
  const redirectTo =
    url.searchParams.get('return_to') || url.searchParams.get('redirect');
  if (!redirectTo) return;

  const redirectPath = getSameOriginPath(redirectTo, origin ?? url.origin);
  if (!redirectPath) {
    console.warn(
      `Cross-domain redirects are not supported. Tried to redirect from ${url.pathname}${url.search} to ${redirectTo}`,
    );
  }

  return redirectPath;
}

/**
 * Normalizes `target` to a path on `origin` that is safe to use as a redirect location.
 * Returns `undefined` unless `target` is a path starting with `/` or an absolute URL,
 * stays on `origin`, and its normalized pathname does not start with `//`.
 */
export function getSameOriginPath(
  target: string | null | undefined,
  origin: string,
): string | undefined {
  if (!target) return undefined;

  try {
    // Absolute values are parsed without a base so their host is never inherited from `origin`.
    const url = target.startsWith('/')
      ? new URL(target, origin)
      : new URL(target);
    if (url.origin !== origin) return undefined;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // A normalized path can begin with `//`, which a browser reads as a host, not a path.
    return path.startsWith('//') ? undefined : path;
  } catch {
    return undefined;
  }
}

function isLocalPath(requestUrl: string, redirectUrl: string) {
  // We don't want to redirect cross domain,
  // doing so could create phishing vulnerability
  // Test for protocols, e.g. https://, http://, //
  // and uris: mailto:, tel:, javascript:, etc.
  try {
    return (
      new URL(requestUrl).origin === new URL(redirectUrl, requestUrl).origin
    );
  } catch (e) {
    return false;
  }
}

/** Ensure redirect url are always using request origin so we never redirect cross domain. Return the full url with request origin.
 *
 * @param requestUrl - Use to find app origin
 * @param defaultUrl - The default URL to redirect to.
 * @param redirectUrl - Relative or absolute URL of redirect. If the absolute URL is cross domain return undefined.
 * */
export function ensureLocalRedirectUrl({
  requestUrl,
  defaultUrl,
  redirectUrl,
}: {
  requestUrl: string;
  defaultUrl: string;
  redirectUrl?: string;
}): string {
  const fromUrl = requestUrl;
  const parsedDefaultUrl = buildURLObject(requestUrl, defaultUrl);
  const toUrl = redirectUrl
    ? buildURLObject(requestUrl, redirectUrl)
    : parsedDefaultUrl;

  if (isLocalPath(requestUrl, toUrl.toString())) {
    return toUrl.toString();
  } else {
    console.warn(
      `Cross-domain redirects are not supported. Tried to redirect from ${fromUrl} to ${toUrl}. Default url ${parsedDefaultUrl} is used instead.`,
    );
    return parsedDefaultUrl.toString();
  }
}

function buildURLObject(
  requestUrl: string,
  relativeOrAbsoluteUrl: string,
): URL {
  return isAbsoluteUrl(relativeOrAbsoluteUrl)
    ? new URL(relativeOrAbsoluteUrl)
    : new URL(relativeOrAbsoluteUrl, new URL(requestUrl).origin);
}

function isAbsoluteUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
