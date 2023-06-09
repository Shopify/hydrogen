import {stringify} from 'worktop/cookie';

export type CookieOptions = {
  maxage?: number;
  expires?: Date | number | string;
  samesite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
  httponly?: boolean;
  domain?: string;
  path?: string;
};

export const cartSetIdDefault = (cookieOptions?: CookieOptions) => {
  return (cartId: string, headers: Headers) => {
    headers.append(
      'Set-Cookie',
      stringify('cart', cartId.split('/').pop() || '', {
        path: '/',
        ...cookieOptions,
      }),
    );
  };
};
