import { applyPrivateResponseCacheHeaders } from "../headers";
import {
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_ORIGIN,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_SHOP_COM_ORIGIN,
} from "../shopify-scripts/constants";
import { normalizeStoreDomain } from "../url";
import type {
  ContentSecurityPolicy,
  ContentSecurityPolicyDirectives,
  ContentSecurityPolicyShop,
  CreateContentSecurityPolicyOptions,
} from "./types";

export type {
  ContentSecurityPolicy,
  ContentSecurityPolicyDirectives,
  ContentSecurityPolicyShop,
  CreateContentSecurityPolicyOptions,
} from "./types";

/**
 * Creates a Shopify-compatible Content Security Policy for one document response. By default it
 * generates a nonce to pass to your framework renderer and Shopify's script tags. Set `nonce` to
 * `false` for a nonce-free policy. Styles allow inline CSS for storefront components.
 *
 * Call the returned policy's `applyResponseHeaders()` to send CSP and prevent caching when it
 * has a nonce. Set the forwarded `Content-Security-Policy` request header to `header` for a
 * renderer such as Next.js. Incoming headers never configure the policy or its nonce.
 *
 * Each call creates a new policy; reuse that object throughout a document's rendering. The
 * development build allows common local HMR connection origins. Add any additional
 * framework development-script allowances explicitly. For static documents, authorize scripts
 * explicitly with hashes or other sources appropriate for your framework.
 *
 * @publicDocs
 */
export function createContentSecurityPolicy(
  options?: CreateContentSecurityPolicyOptions & { nonce?: undefined },
): ContentSecurityPolicy<string>;
export function createContentSecurityPolicy(
  options: CreateContentSecurityPolicyOptions & { nonce: false },
): ContentSecurityPolicy<undefined>;
export function createContentSecurityPolicy(
  options?: CreateContentSecurityPolicyOptions,
): ContentSecurityPolicy;
export function createContentSecurityPolicy(
  options: CreateContentSecurityPolicyOptions = {},
): ContentSecurityPolicy {
  const nonce = options.nonce === false ? undefined : generateNonce();
  const directives: ContentSecurityPolicyDirectives = getShopifyCspDirectives(options.shop);
  mergeDirectives(directives, options.directives);
  if (nonce !== undefined) {
    directives.scriptSrc = withNonce(directives.scriptSrc, nonce);
    if (directives.scriptSrcElem != null) {
      directives.scriptSrcElem = withNonce(directives.scriptSrcElem, nonce);
    }
  }
  const header = serializeDirectives(directives);
  return Object.freeze({
    nonce,
    header,
    applyResponseHeaders(headers: Headers) {
      headers.set("Content-Security-Policy", header);
      // A cached document would reuse its nonce on subsequent responses.
      if (nonce !== undefined) applyPrivateResponseCacheHeaders(headers);
    },
  });
}

function mergeDirectives(
  defaults: ContentSecurityPolicyDirectives,
  overrides: ContentSecurityPolicyDirectives | undefined,
): void {
  if (overrides === undefined) return;
  const values: Record<string, unknown> = defaults;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    if (!DIRECTIVE_KEY.test(key)) throw new TypeError(`Invalid CSP directive: ${key}`);
    // Only Hydrogen generates nonces, so a nonce can't be reused across cached responses.
    if (Array.isArray(value) && value.some((source) => /^'nonce-/i.test(source))) {
      throw new TypeError("CSP directives cannot contain manually supplied nonces.");
    }
    values[key] = mergeSources(value, values[key]);
  }
}

function mergeSources(value: unknown, defaults: unknown): unknown {
  if (!Array.isArray(value) || !Array.isArray(defaults)) return value;
  if (defaults.length > 0 && defaults.every((source) => source.toLowerCase() === "'none'")) {
    return [...value];
  }
  return [...value, ...defaults];
}

/**
 * Returns fresh Shopify CSP defaults for a framework's own CSP configuration. Development
 * connections are included by the development package export. Framework configuration loaded
 * directly by Node can select that export with `--conditions=development`.
 * `createContentSecurityPolicy` uses these same defaults. They do not authorize inline scripts;
 * configure their authorization explicitly.
 * @publicDocs
 */
export function getShopifyCspDirectives(shop: ContentSecurityPolicyShop = {}) {
  const shopOrigins = [shop.storeDomain, shop.checkoutDomain || undefined]
    .filter((domain) => domain !== undefined)
    .map(normalizeStoreDomain);

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    scriptSrc: ["'self'", SHOPIFY_CDN_ORIGIN],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'", SHOPIFY_CDN_ORIGIN],
    imgSrc: ["'self'", SHOPIFY_CDN_ORIGIN, "data:"],
    fontSrc: ["'self'", SHOPIFY_CDN_ORIGIN],
    mediaSrc: ["'self'", SHOPIFY_CDN_ORIGIN],
    frameSrc: [
      "'self'",
      SHOPIFY_ORIGIN,
      SHOPIFY_SHOP_APP_ORIGIN,
      SHOPIFY_SHOP_COM_ORIGIN,
      ...shopOrigins,
    ],
    connectSrc: [
      "'self'",
      SHOPIFY_CDN_ORIGIN,
      SHOPIFY_SHOP_APP_ORIGIN,
      SHOPIFY_SHOP_COM_ORIGIN,
      SHOPIFY_ORIGIN,
      "https://*.shopifysvc.com",
      ...shopOrigins,
      ...(__DEV__
        ? [
            "http://localhost:*",
            "https://localhost:*",
            "ws://localhost:*",
            "wss://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
            "ws://127.0.0.1:*",
            "wss://127.0.0.1:*",
            "ws://*.tryhydrogen.dev:*",
            "wss://*.tryhydrogen.dev:*",
          ]
        : []),
    ],
  } satisfies ContentSecurityPolicyDirectives;
}

function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

function withNonce(sources: readonly string[] | null | undefined, nonce: string): string[] {
  return [...(sources ?? []), `'nonce-${nonce}'`];
}

// camelCase only, so a key can't inject another directive or reach the prototype.
const DIRECTIVE_KEY = /^[a-z]+(?:[A-Z][a-z]*)*$/;

function serializeDirectives(directives: ContentSecurityPolicyDirectives): string {
  return Object.entries(directives)
    .flatMap(([key, value]) => {
      if (value == null) return [];
      const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      if (typeof value === "boolean") return value ? [name] : [];
      const sources = [...new Set(value.map(validateSource))];
      if (sources.some((source) => source.toLowerCase() === "'none'") && sources.length > 1) {
        throw new TypeError(`CSP directive ${key} cannot combine 'none' with other sources.`);
      }
      return [[name, ...sources].join(" ")];
    })
    .join("; ");
}

function validateSource(value: string): string {
  if (!value || /[^\u0021-\u007e]|[;,]/.test(value)) {
    throw new TypeError(
      "CSP sources must be non-empty ASCII tokens without whitespace, commas, or semicolons.",
    );
  }
  return value;
}
