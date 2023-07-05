import {parse} from 'worktop/cookie';

export const cartGetIdDefault = (requestHeaders: Headers) => {
  const cookies = parse(requestHeaders.get('Cookie') || '');
  return () => {
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
  };
};
