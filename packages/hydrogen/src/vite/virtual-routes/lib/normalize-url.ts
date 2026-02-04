const URL_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

function extractHostname(value: string) {
  const hostPortEndIndex = value.search(/[/?#]/);
  const hostPort =
    hostPortEndIndex === -1 ? value : value.slice(0, hostPortEndIndex);

  if (hostPort.startsWith('[')) {
    const endBracketIndex = hostPort.indexOf(']');

    if (endBracketIndex !== -1) {
      return hostPort.slice(1, endBracketIndex);
    }
  }

  return hostPort.split(':')[0] ?? '';
}

function isLocalhostHost(value: string) {
  const hostname = extractHostname(value).toLowerCase();

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  );
}

export function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return trimmedValue;

  const normalizedUrl = URL_SCHEME_REGEX.test(trimmedValue)
    ? new URL(trimmedValue)
    : trimmedValue.startsWith('//')
      ? new URL(
          `${isLocalhostHost(trimmedValue.slice(2)) ? 'http' : 'https'}:${trimmedValue}`,
        )
      : new URL(
          `${isLocalhostHost(trimmedValue) ? 'http' : 'https'}://${trimmedValue}`,
        );

  if (
    normalizedUrl.pathname === '/' &&
    !normalizedUrl.search &&
    !normalizedUrl.hash
  ) {
    normalizedUrl.pathname = '';
  }

  return normalizedUrl.toString();
}
