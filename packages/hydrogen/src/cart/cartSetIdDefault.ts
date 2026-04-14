// @ts-ignore - worktop/cookie types not properly exported
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

/** @publicDocs */
export const cartSetIdDefault = (cookieOptions?: CookieOptions) => {
  return (cartId: string) => {
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      stringify('cart', cartId.split('/').pop() || '', {
        path: '/',
        ...cookieOptions,
      }),
    );
    return headers;
  };
};
