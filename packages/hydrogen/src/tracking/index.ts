import {getShopifyCookies, SHOPIFY_S, SHOPIFY_Y} from '@shopify/hydrogen-react';
import {type CrossRuntimeRequest, getHeader} from '../utils/request';
import {appendHeader, CrossRuntimeResponse} from '../utils/response';

const oneYearMs = 365 * 24 * 60 * 60 * 1000;
const thirtyMinutesMs = 30 * 60 * 1000;

/**
 * Sets Shopify tracking cookies on the response based on the request cookies.
 */
export function setTrackingCookies(
  request: CrossRuntimeRequest,
  response: CrossRuntimeResponse,
) {
  const cookies = getShopifyCookies(getHeader(request, 'Cookie') || '');
  const y = cookies[SHOPIFY_Y];
  const s = cookies[SHOPIFY_S];

  if (y || s) {
    let cookieOptions = `SameSite=Strict; Secure; HttpOnly; Max-Age=${Math.floor(oneYearMs / 1000)}`;
    if (request.url) {
      const url = new URL(request.url);
      const domain = url.hostname.split('.').slice(-2).join('.'); // root domain
      cookieOptions = `Domain=.${domain}; Path=/; ${cookieOptions}`;
    }

    const now = Date.now();
    const cookieValue = btoa(
      JSON.stringify({
        visitorToken: y ? {value: y, expires: now + oneYearMs} : undefined,
        sessionToken: s
          ? {value: s, expires: now + thirtyMinutesMs}
          : undefined,
      }),
    );

    appendHeader(
      response,
      'Set-Cookie',
      `_shopify_marketing_remote=${cookieValue}; ${cookieOptions}`,
    );
    appendHeader(
      response,
      'Set-Cookie',
      `_shopify_analytics_remote=${cookieValue}; ${cookieOptions}`,
    );
  }
}
