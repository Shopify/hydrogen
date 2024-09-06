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

type DirectiveValues = string[] | string | boolean;

type CreateContentSecurityPolicy = {
  defaultSrc?: DirectiveValues;
  scriptSrc?: DirectiveValues;
  scriptSrcElem?: DirectiveValues;
  styleSrc?: DirectiveValues;
  imgSrc?: DirectiveValues;
  connectSrc?: DirectiveValues;
  fontSrc?: DirectiveValues;
  objectSrc?: DirectiveValues;
  mediaSrc?: DirectiveValues;
  frameSrc?: DirectiveValues;
  sandbox?: DirectiveValues;
  reportUri?: DirectiveValues;
  childSrc?: DirectiveValues;
  formAction?: DirectiveValues;
  frameAncestors?: DirectiveValues;
  pluginTypes?: DirectiveValues;
  baseUri?: DirectiveValues;
  reportTo?: DirectiveValues;
  workerSrc?: DirectiveValues;
  manifestSrc?: DirectiveValues;
  prefetchSrc?: DirectiveValues;
  navigateTo?: DirectiveValues;
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
};

type ShopifyDomains = {
  /** The production shop checkout domain url.  */
  checkoutDomain?: string;
  /** The production shop domain url. */
  storeDomain?: string;
};

type ShopProp = {
  /** Shop specific configurations */
  shop?: ShopifyDomains;
};

/**
 * @param directives - Pass custom [content security policy directives](https://content-security-policy.com/). This is important if you load content in your app from third-party domains.
 */
export function createContentSecurityPolicy(
  props?: CreateContentSecurityPolicy & ShopProp,
): ContentSecurityPolicy {
  const nonce = generateNonce();
  const header = createCSPHeader(nonce, props);

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
  props?: CreateContentSecurityPolicy & ShopProp,
): string {
  const {shop, ...directives} = props ?? {};
  const nonceString = `'nonce-${nonce}'`;
  const styleSrc = ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'];
  const connectSrc = ["'self'", 'https://monorail-edge.shopifysvc.com'];
  if (shop && shop.checkoutDomain) {
    connectSrc.push(`https://${shop.checkoutDomain}`);
  }

  if (shop && shop.storeDomain) {
    connectSrc.push(`https://${shop.storeDomain}`);
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
      'ws://*.tryhydrogen.dev:*',
    ];
  }

  const combinedDirectives = Object.assign({}, defaultDirectives, directives);

  //add defaults if it was override
  for (const key in defaultDirectives) {
    const directive = directives[key as keyof CreateContentSecurityPolicy];
    if (key && directive) {
      combinedDirectives[key] = addCspDirective(
        directive,
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
    combinedDirectives.scriptSrc = [
      ...combinedDirectives.scriptSrc.filter((ss) => !ss.startsWith('nonce')),
      nonceString,
    ];
  } else if (
    combinedDirectives.defaultSrc instanceof Array &&
    !combinedDirectives.defaultSrc.includes(nonceString)
  ) {
    combinedDirectives.defaultSrc = [
      ...combinedDirectives.defaultSrc.filter((ss) => !ss.startsWith('nonce')),
      nonceString,
    ];
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
    ? // If the default directive is `none`, don't
      // merge the override with the default value.
      normalizedValue.every((a) => a === `'none'`)
      ? normalizedCurrentValue
      : [...normalizedCurrentValue, ...normalizedValue]
    : normalizedValue;

  return newValue;
}
