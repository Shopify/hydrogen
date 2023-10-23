import {generateUUID} from './uuid';

export type CrossRuntimeRequest = {
  url?: string;
  method?: string;
  socket?: {remoteAddress?: string}; // For Node request
  headers: {
    get?: (key: string) => string | null | undefined;
    [key: string]: any;
  };
};

export function getClientIp(request: CrossRuntimeRequest) {
  return (
    request.headers?.get?.('oxygen-buyer-ip') ??
    request.headers?.get?.('cf-connecting-ip') ??
    request.headers?.['x-forwarded-for']?.split(',')[0] ??
    request.socket?.remoteAddress ??
    null
  );
}

export function getRequestId(request: CrossRuntimeRequest) {
  let requestId = getHeader(request, 'request-id');

  if (!requestId) {
    // Store it in the headers object for later access
    request.headers['request-id'] = requestId = generateUUID();
  }

  return requestId;
}

export function getHeader(request: CrossRuntimeRequest, key: string) {
  const value = request.headers?.get?.(key) ?? request.headers?.[key];
  return typeof value === 'string' ? value : null;
}

export function getDebugHeaders(request?: CrossRuntimeRequest) {
  return request
    ? {
        requestId: getRequestId(request),
        purpose: getHeader(request, 'purpose'),
      }
    : {};
}
