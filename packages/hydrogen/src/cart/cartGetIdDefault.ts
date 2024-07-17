import {parse} from 'worktop/cookie';
import type {CrossRuntimeRequest} from '../utils/request';

export const cartGetIdDefault = (
  requestHeaders: Headers | CrossRuntimeRequest['headers'],
) => {
  const cookies = parse(
    (requestHeaders.get ? requestHeaders.get('Cookie') : undefined) || '',
  );
  return () => {
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
  };
};
