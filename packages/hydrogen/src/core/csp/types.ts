import type { ShopifyRequestContext } from "../request-context";

type Sources = readonly string[] | null;

/**
 * CSP directives. Arrays extend a directive's defaults. An array replaces a default consisting
 * only of `'none'`; `null` omits the directive, except that nonce mode still creates a
 * `script-src` containing the generated nonce.
 */
export type ContentSecurityPolicyDirectives = {
  defaultSrc?: Sources;
  scriptSrc?: Sources;
  scriptSrcElem?: Sources;
  scriptSrcAttr?: Sources;
  styleSrc?: Sources;
  styleSrcElem?: Sources;
  styleSrcAttr?: Sources;
  imgSrc?: Sources;
  connectSrc?: Sources;
  fontSrc?: Sources;
  objectSrc?: Sources;
  mediaSrc?: Sources;
  frameSrc?: Sources;
  childSrc?: Sources;
  workerSrc?: Sources;
  manifestSrc?: Sources;
  baseUri?: Sources;
  formAction?: Sources;
  frameAncestors?: Sources;
  sandbox?: Sources;
  reportUri?: Sources;
  reportTo?: Sources;
  upgradeInsecureRequests?: boolean;
};

/** The shop's domains that browser scripts may contact. */
export type ContentSecurityPolicyShop = {
  storeDomain?: string;
  checkoutDomain?: string;
};

/** Options for a per-document policy. */
export type CreateContentSecurityPolicyOptions = {
  /** Registers the policy for both response headers and forwarded request headers. */
  requestContext?: ShopifyRequestContext;
  shop?: ContentSecurityPolicyShop;
  /** Extends individual defaults. In nonce mode, the nonce is added to `script-src` and any supplied `script-src-elem`. Browsers use `script-src-elem` over `script-src` for script elements. */
  directives?: ContentSecurityPolicyDirectives;
  /** Set to `false` for a nonce-free policy. This does not automatically authorize inline scripts or disable caching. */
  nonce?: false;
};

/** A policy header and its nonce, if enabled. */
export type ContentSecurityPolicy<Nonce extends string | undefined = string | undefined> = {
  readonly nonce: Nonce;
  readonly header: string;
};
