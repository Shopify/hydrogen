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

// Regular expression to match Storefront API GraphQL endpoint paths.
export const SFAPI_RE = /^\/api\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;

export const getSafePathname = (url: string) => {
  try {
    return new URL(url, 'http://e.c').pathname;
  } catch {
    return '/';
  }
};
