export function getRedirectUrl(requestUrl?: string): string | undefined {
  if (!requestUrl) return;

  const {pathname, search} = new URL(requestUrl);
  const redirectFrom = pathname + search;

  const searchParams = new URLSearchParams(search);
  const redirectTo =
    searchParams.get('return_to') || searchParams.get('redirect');

  if (redirectTo) {
    if (isLocalPath(requestUrl, redirectTo)) {
      return redirectTo;
    } else {
      console.warn(
        `Cross-domain redirects are not supported. Tried to redirect from ${redirectFrom} to ${redirectTo}`,
      );
    }
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
  const defautlUrl = buildURLObject(requestUrl, defaultUrl);
  const toUrl = redirectUrl
    ? buildURLObject(requestUrl, redirectUrl)
    : defautlUrl;

  if (isLocalPath(requestUrl, toUrl.toString())) {
    return toUrl.toString();
  } else {
    console.warn(
      `Cross-domain redirects are not supported. Tried to redirect from ${fromUrl} to ${toUrl}. Default url ${defautlUrl} is used instead.`,
    );
    return defautlUrl.toString();
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
