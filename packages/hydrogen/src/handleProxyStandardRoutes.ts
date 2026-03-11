import type {Storefront} from './storefront';

export function handleProxyStandardRoutes({
  request,
  storefront,
}: {
  request: Request;
  storefront: Pick<Storefront, 'isStorefrontApiUrl' | 'forward'>;
}): Promise<Response> | undefined {
  if (!storefront.isStorefrontApiUrl(request)) {
    return undefined;
  }

  return storefront.forward(request);
}
