import {
  type ComponentType,
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from 'react';
import cspBuilder from 'content-security-policy-builder';
import {generateNonce} from './nonce';

export const NonceContext = createContext<string | undefined>(undefined);
export const NonceProvider = NonceContext.Provider;

export const useNonce = () => useContext(NonceContext);

type ContentSecurityPolicy = {
  /** A randomly generated nonce string that should be passed to any custom `script` element */
  nonce: string;
  /** The content security policy header */
  header: string;
  NonceProvider: ComponentType<{children: ReactNode}>;
};

/**
 * @param directives - Pass custom [content security policy directives](https://content-security-policy.com/). This is important if you load content in your app from third-party domains.
 */
export function createContentSecurityPolicy(
  directives: Record<string, string[] | string | boolean> = {},
): ContentSecurityPolicy {
  const nonce = generateNonce();
  const header = createCSPHeader(nonce, directives);

  const Provider = ({children}: {children: ReactNode}) => {
    return createElement(NonceProvider, {value: nonce}, children);
  };

  return {
    nonce,
    header,
    NonceProvider: Provider,
  };
}

function createCSPHeader(
  nonce: string,
  directives: Record<string, string[] | string | boolean> = {},
): string {
  const nonceString = `'nonce-${nonce}'`;
  const defaultDirectives: Record<string, string[] | string | boolean> = {
    baseUri: ["'self'"],
    defaultSrc: [
      "'self'",
      nonceString,
      'https://cdn.shopify.com',
      // Used for the Customer Account API
      'https://shopify.com',
    ],
    frameAncestors: ['none'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'],
    connectSrc: ["'self'", 'https://monorail-edge.shopifysvc.com'],
  };

  // Support HMR in local development
  if (process.env.NODE_ENV === 'development') {
    defaultDirectives.connectSrc = ['*'];
  }

  const combinedDirectives = Object.assign({}, defaultDirectives, directives);

  // Make sure that at least script-src includes a nonce directive.
  // If someone doesn't want a nonce in their CSP, they probably
  // shouldn't use our utilities and just manually create their CSP.
  if (
    combinedDirectives.scriptSrc instanceof Array &&
    !combinedDirectives.scriptSrc.includes(nonceString)
  ) {
    combinedDirectives.scriptSrc.push(nonceString);
  } else if (
    combinedDirectives.defaultSrc instanceof Array &&
    !combinedDirectives.defaultSrc.includes(nonceString)
  ) {
    combinedDirectives.defaultSrc.push(nonceString);
  }

  return cspBuilder({
    directives: combinedDirectives,
  });
}
