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

// build redirect url using request url origin to ensure there is no cross domain redirect
// redirectUrl can be absolute or relative url
export function buildLocalRedirectUrl(requestUrl: string, redirectUrl: string) {
  return isAbsoluteUrl(redirectUrl)
    ? new URL(
        new URL(redirectUrl).pathname,
        new URL(requestUrl).origin,
      ).toString()
    : new URL(redirectUrl, new URL(requestUrl).origin).toString();
}

function isAbsoluteUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
