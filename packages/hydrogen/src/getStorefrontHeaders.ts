import type {CrossRuntimeRequest} from './utils/request';

export type StorefrontHeaders = {
  /** A unique ID that correlates all sub-requests together. */
  requestGroupId: string | null;
  /** The IP address of the client. */
  buyerIp: string | null;
  /** The cookie header from the client  */
  cookie: string | null;
  /** The purpose header value for debugging */
  purpose: string | null;
};

export function getStorefrontHeaders(
  request: Request | CrossRuntimeRequest,
): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: (headers.get ? headers.get('request-id') : null) || null,
    buyerIp: (headers.get ? headers.get('oxygen-buyer-ip') : null) || null,
    cookie: (headers.get ? headers.get('cookie') : null) || null,
    purpose: (headers.get ? headers.get('purpose') : null) || null,
  };
}
