export type CrossRuntimeRequest = {
  url?: string;
  method?: string;
  headers: {
    get?: (key: string) => string | null | undefined;
    [key: string]: any;
  };
};

export function getHeader(request: CrossRuntimeRequest, key: string) {
  const value = request.headers?.get?.(key) ?? request.headers?.[key];
  return typeof value === 'string' ? value : null;
}

export function getDebugHeaders(request?: CrossRuntimeRequest) {
  return {
    requestId: request ? getHeader(request, 'request-id') : undefined,
    purpose: request ? getHeader(request, 'purpose') : undefined,
  };
}
