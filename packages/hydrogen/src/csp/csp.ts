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

type CreateContentSecurityPolicy = {
  [key: string]: string[] | string | boolean;
}

type ShopifyDomains = {
  checkoutDomain?: string;
  storeDomain?: string;
}

/**
 * @param directives - Pass custom [content security policy directives](https://content-security-policy.com/). This is important if you load content in your app from third-party domains.
 */
export function createContentSecurityPolicy(
  props?: ShopifyDomains & CreateContentSecurityPolicy
): ContentSecurityPolicy {
  const nonce = generateNonce();
  const header = createCSPHeader(nonce, props ?? {});

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
  props?: CreateContentSecurityPolicy & ShopifyDomains,
): string {
  const {checkoutDomain, storeDomain, ...directives} = props ?? {};
  const nonceString = `'nonce-${nonce}'`;
  const styleSrc = ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'];
  const connectSrc = ["'self'", 'https://monorail-edge.shopifysvc.com'];
  if (checkoutDomain) {
    connectSrc.push(`https://${checkoutDomain}`);
  }

  if (storeDomain) {
    connectSrc.push(`https://${storeDomain}`);
  }

  const defaultSrc = [
    "'self'",
    nonceString,
    'https://cdn.shopify.com',
    // Used for the Customer Account API
    'https://shopify.com',
  ];

  const defaultDirectives: Record<string, string[] | string | boolean> = {
    baseUri: ["'self'"],
    defaultSrc,
    frameAncestors: ["'none'"],
    styleSrc,
    connectSrc,
  };

  // Support localhost in development
  if (process.env.NODE_ENV === 'development') {
    defaultDirectives.styleSrc = [...styleSrc, 'http://localhost:*'];
    defaultDirectives.defaultSrc = [...defaultSrc, 'http://localhost:*'];
    defaultDirectives.connectSrc = [
      ...connectSrc,
      'http://localhost:*',
      // For HMR:
      'ws://localhost:*',
      'ws://127.0.0.1:*',
      'ws://*.trycloudflare.com:*',
    ];
  }

  const combinedDirectives = Object.assign({}, defaultDirectives, directives);

  //add defaults if it was override
  for (const key in defaultDirectives) {
    if (directives[key]) {
      combinedDirectives[key] = addCspDirective(
        directives[key],
        defaultDirectives[key],
      );
    }
  }

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

function addCspDirective(
  currentValue: string[] | string | boolean,
  value: string[] | string | boolean,
): boolean | string[] {
  const normalizedValue = typeof value === 'string' ? [value] : value;
  const normalizedCurrentValue = Array.isArray(currentValue)
    ? currentValue
    : [String(currentValue)];

  const newValue = Array.isArray(normalizedValue)
    ? [...normalizedCurrentValue, ...normalizedValue]
    : normalizedValue;

  return newValue;
}
