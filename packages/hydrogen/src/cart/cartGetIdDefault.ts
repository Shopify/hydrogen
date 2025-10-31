import {parse} from 'worktop/cookie';
import {type CrossRuntimeRequest, getHeaderValue} from '../utils/request';

export const cartGetIdDefault = (
  requestHeaders: CrossRuntimeRequest['headers'],
) => {
  const cookies = parse(getHeaderValue(requestHeaders, 'Cookie') || '');
  return () => {
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
  };
};
