import {redirect} from 'react-router';
import type {ProductFragment} from 'storefrontapi.generated';
import {isCombinedListing} from './combined-listings';

export function redirectIfHandleIsLocalized(
  request: Request,
  ...localizedResources: Array<{
    handle: string;
    data: {handle: string} & unknown;
  }>
) {
  const url = new URL(request.url);
  let shouldRedirect = false;

  localizedResources.forEach(({handle, data}) => {
    if (handle !== data.handle) {
      url.pathname = url.pathname.replace(handle, data.handle);
      shouldRedirect = true;
    }
  });

  if (shouldRedirect) {
    throw redirect(url.toString());
  }
}

export function redirectIfCombinedListing(
  request: Request,
  product: ProductFragment,
) {
  const url = new URL(request.url);
  let shouldRedirect = false;

  if (isCombinedListing(product)) {
    url.pathname = url.pathname.replace(
      product.handle,
      product.selectedOrFirstAvailableVariant?.product.handle ?? '',
    );
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    throw redirect(url.toString());
  }
}
