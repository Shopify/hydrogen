import type {StorefrontHeaders} from '../types';
import {SHOPIFY_CLIENT_IP_SIG_HEADER} from '../constants';

export function getStorefrontHeaders(request: Request): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: headers.get('request-id'),
    buyerIp: headers.get('oxygen-buyer-ip'),
    buyerIpSig: headers.get(SHOPIFY_CLIENT_IP_SIG_HEADER),
    cookie: headers.get('cookie'),
    purpose: headers.get('purpose'),
  };
}
