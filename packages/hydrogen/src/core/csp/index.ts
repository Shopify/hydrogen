import { SHOPIFY_CDN_ORIGIN } from "../shopify-scripts/constants";
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
 * With a request context, repeated calls with equivalent configuration return the same policy.
 * `applyResponseHeaders()` applies the policy, and disables response caching when it has a nonce.
 * `getForwardedRequestHeaders()` forwards the policy in the enforcing CSP header. Incoming CSP
 * headers are never used to configure the policy or its nonce.
 *
 * Without a request context, apply the returned header yourself and prevent caching when it has
 * a nonce. The development build allows common local HMR connection origins. Add any additional
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
  const { requestContext } = options;
  const existing = requestContext?.getContentSecurityPolicy();
  // Reusing the registered nonce makes equivalent calls produce the same header, while a
  // different configuration or nonce mode produces a different one.
  const nonce = options.nonce === false ? undefined : (existing?.nonce ?? generateNonce());
  const policy = buildPolicy(options, nonce);
  if (existing && existing.header !== policy.header) {
    throw new TypeError(
      "A different Content Security Policy is already registered for this request.",
    );
  }
  if (requestContext && !existing) requestContext.setContentSecurityPolicy(policy);
  return existing ?? policy;
}

function buildPolicy(
  options: CreateContentSecurityPolicyOptions,
  nonce: string | undefined,
): ContentSecurityPolicy {
  const directives = getShopifyCspDirectives(options.shop);
  mergeDirectives(directives, options.directives);
  rejectManualNonces(directives);
  if (nonce !== undefined) {
    directives.scriptSrc = withNonce(directives.scriptSrc, nonce);
    if (directives.scriptSrcElem != null) {
      directives.scriptSrcElem = withNonce(directives.scriptSrcElem, nonce);
    }
  }
  return Object.freeze({ nonce, header: serializeDirectives(directives) });
}

function mergeDirectives(
  defaults: ContentSecurityPolicyDirectives,
  overrides: ContentSecurityPolicyDirectives | undefined,
): void {
  if (overrides === undefined) return;
  const values: Record<string, unknown> = defaults;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    if (!Object.hasOwn(DIRECTIVE_NAMES, key)) throw new TypeError(`Unknown CSP directive: ${key}`);
    values[key] = mergeSources(value, Object.hasOwn(values, key) ? values[key] : undefined);
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
export function getShopifyCspDirectives(
  shop: ContentSecurityPolicyShop = {},
): ContentSecurityPolicyDirectives {
  const shopOrigins = [shop.storeDomain, shop.checkoutDomain]
    .filter((domain) => domain !== undefined)
    .map(getShopOrigin);

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
    frameSrc: ["'self'", "https://shopify.com", "https://shop.app", ...shopOrigins],
    connectSrc: [
      "'self'",
      SHOPIFY_CDN_ORIGIN,
      "https://shop.app",
      "https://shopify.com",
      "https://monorail-edge.shopifysvc.com",
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
  };
}

function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

function getShopOrigin(domain: string): string {
  const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(
      "CSP shop domains must be HTTPS origins without credentials, paths, or queries.",
    );
  }
  return url.origin;
}

function withNonce(sources: readonly string[] | null | undefined, nonce: string): string[] {
  return [...(sources ?? []), `'nonce-${nonce}'`];
}

function rejectManualNonces(directives: ContentSecurityPolicyDirectives): void {
  for (const value of Object.values(directives)) {
    if (Array.isArray(value) && value.some((source) => /^'nonce-/i.test(source))) {
      throw new TypeError("CSP directives cannot contain manually supplied nonces.");
    }
  }
}

const DIRECTIVE_NAMES: Record<keyof ContentSecurityPolicyDirectives, string> = {
  defaultSrc: "default-src",
  scriptSrc: "script-src",
  scriptSrcElem: "script-src-elem",
  scriptSrcAttr: "script-src-attr",
  styleSrc: "style-src",
  styleSrcElem: "style-src-elem",
  styleSrcAttr: "style-src-attr",
  imgSrc: "img-src",
  connectSrc: "connect-src",
  fontSrc: "font-src",
  objectSrc: "object-src",
  mediaSrc: "media-src",
  frameSrc: "frame-src",
  childSrc: "child-src",
  workerSrc: "worker-src",
  manifestSrc: "manifest-src",
  baseUri: "base-uri",
  formAction: "form-action",
  frameAncestors: "frame-ancestors",
  sandbox: "sandbox",
  reportUri: "report-uri",
  reportTo: "report-to",
  upgradeInsecureRequests: "upgrade-insecure-requests",
};

function serializeDirectives(directives: ContentSecurityPolicyDirectives): string {
  const values: Record<string, readonly string[] | boolean | null | undefined> = directives;
  return Object.entries(DIRECTIVE_NAMES)
    .flatMap(([key, name]) => {
      const value = Object.hasOwn(values, key) ? values[key] : undefined;
      if (value == null) return [];
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
