import {createContext, useContext} from 'react';
import cspBuilder from 'content-security-policy-builder';

const CSPContext = createContext<string | undefined>(undefined);

export const CSPProvider = CSPContext.Provider;

export const useNonce = () => useContext(CSPContext);

export function createCSPHeader(nonce: string, directives = {}) {
  const defaultDirectives = {
    baseUri: ["'self'"],
    defaultSrc: ["'self'", `'nonce-${nonce}'`, 'https://cdn.shopify.com'],
    frameAncestors: ['none'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'],
  };
  return cspBuilder({
    directives: Object.assign({}, defaultDirectives, directives),
  });
}

export function generateNonce() {
  return toHexString(crypto.getRandomValues(new Uint8Array(16)));
}

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}
