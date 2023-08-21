import {useContext} from 'react';
import cspBuilder from 'content-security-policy-builder';
import {HydrogenServerContext} from '../HydrogenServerProvider';

export const useNonce = () => {
  return useContext(HydrogenServerContext).nonce;
};

export function createCSPHeader(
  nonce?: string,
  directives: Record<string, string[] | string | boolean> = {},
) {
  const defaultDirectives: Record<string, string[] | string | boolean> = {
    baseUri: ["'self'"],
    defaultSrc: nonce
      ? ["'self'", `'nonce-${nonce}'`, 'https://cdn.shopify.com']
      : ["'unsafe-inline'", 'https://cdn.shopify.com'],
    frameAncestors: ['none'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'],
  };

  if (process.env.NODE_ENV === 'development') {
    defaultDirectives.connectSrc = ['*'];
  }

  return cspBuilder({
    directives: Object.assign({}, defaultDirectives, directives),
  });
}

export function generateNonce() {
  return toHexString(randomUint8Array());
}

function randomUint8Array() {
  try {
    return crypto.getRandomValues(new Uint8Array(16));
  } catch (e) {
    return new Uint8Array(16).map(() => (Math.random() * 255) | 0);
  }
}

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}
