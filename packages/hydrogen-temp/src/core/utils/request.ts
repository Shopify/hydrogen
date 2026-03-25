import {SHOPIFY_CLIENT_IP_SIG_HEADER} from '../constants';
import type {StorefrontHeaders} from '../types';

export type CrossRuntimeRequest = {
  url?: string;
  method?: string;
  headers: {
    get?: (key: string) => string | null | undefined;
    [key: string]: any;
  };
};

export function getHeader(request: CrossRuntimeRequest, key: string) {
  return getHeaderValue(request.headers, key);
}

export function getHeaderValue(
  headers: CrossRuntimeRequest['headers'],
  key: string,
) {
  const value = headers?.get?.(key) ?? headers?.[key];
  return typeof value === 'string' ? value : null;
}

export function getDebugHeaders(request?: CrossRuntimeRequest) {
  return {
    requestId: request ? getHeader(request, 'request-id') : undefined,
    purpose: request ? getHeader(request, 'purpose') : undefined,
  };
}

/**
 * Extracts relevant Storefront headers from the given Oxygen request.
 */
export function getStorefrontHeaders(
  request: CrossRuntimeRequest,
): StorefrontHeaders {
  return {
    requestGroupId: getHeader(request, 'request-id'),
    buyerIp: getHeader(request, 'oxygen-buyer-ip'),
    buyerIpSig: getHeader(request, SHOPIFY_CLIENT_IP_SIG_HEADER),
    cookie: getHeader(request, 'cookie'),
    // sec-purpose is added by browsers automatically when using link/prefetch or Speculation Rules
    purpose: getHeader(request, 'sec-purpose') || getHeader(request, 'purpose'),
  };
}

/** Matches the SFAPI GraphQL endpoint path regardless of mount prefix.
 * Used by storefront.ts which lacks basePath context. */
export const SFAPI_SUFFIX_RE = /\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;

/** Start-and-end anchored route pattern — used after stripping the basePath. */
const SFAPI_ROUTE_RE = /^\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;

/**
 * Normalizes a user-supplied base path to canonical form:
 * leading slash, no trailing slash, empty string for root mount.
 */
function normalizeBasePath(raw: string): string {
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed ? '/' + trimmed : '';
}

/**
 * Matches the SFAPI GraphQL endpoint at exactly `basePath/<version>/graphql.json`.
 * Rejects URLs with extra segments between the basePath and the version.
 */
export function matchSfapiRoute(
  url: string,
  basePath: string,
): RegExpMatchArray | null {
  const pathname = getSafePathname(url);
  const normalizedBase = normalizeBasePath(basePath);

  if (!pathname.startsWith(normalizedBase)) return null;

  const remainder = pathname.slice(normalizedBase.length);
  return remainder.match(SFAPI_ROUTE_RE);
}

export const getSafePathname = (url: string) => {
  try {
    return new URL(url, 'http://e.c').pathname;
  } catch {
    return '/';
  }
};

export function extractHeaders(
  extract: (key: string) => string | undefined | null,
  keys: string[],
) {
  return keys.reduce<[string, string][]>((acc, key) => {
    const forwardedValue = extract(key);
    if (forwardedValue) acc.push([key, forwardedValue]);
    return acc;
  }, []);
}
