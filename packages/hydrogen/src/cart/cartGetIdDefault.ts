// @ts-ignore - worktop/cookie types not properly exported
import {parse} from 'worktop/cookie';
import {type CrossRuntimeRequest, getHeaderValue} from '../utils/request';

/**
 * Creates a function that returns the cart id from request header cookie.
 * @publicDocs
 */
export const cartGetIdDefault = (
  requestHeaders: CrossRuntimeRequest['headers'],
) => {
  const cookies = parse(getHeaderValue(requestHeaders, 'Cookie') || '');
  return () => {
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
  };
};
