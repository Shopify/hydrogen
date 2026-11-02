import { afterEach, describe, expect, it, vi } from "vitest";

import { CONSENT_MANAGEMENT_HEADER } from "../headers";
import { createShopifyRequestContext } from "../request-context";
import { assert } from "../test-utils";
import { createContentSecurityPolicy, getShopifyCspDirectives } from "./index";
import type { ContentSecurityPolicyDirectives } from "./types";

const CSP = "Content-Security-Policy";
const CSP_REPORT_ONLY = "Content-Security-Policy-Report-Only";
const PRIVATE_CACHE = "private, no-store, max-age=0, must-revalidate";
const MANUAL_NONCE = "'nonce-abcdefghijklmnopqrstuvwxyz012345'";
const DEV_CONNECTIONS = [
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
];

function createContext(headers = new Headers()) {
  return createShopifyRequestContext({
    request: new Request("https://store.example/products/shirt", { headers }),
    i18n: { country: "US", language: "EN" },
  });
}

function directive(header: string, name: string): string | undefined {
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
}

function cacheableHeaders(): Headers {
  return new Headers({
    "Cache-Control": "public, max-age=60",
    "Oxygen-Cache-Control": "public, max-age=600",
    "CDN-Cache-Control": "public, s-maxage=600",
    "Surrogate-Control": "max-age=600",
  });
}

afterEach(() => vi.restoreAllMocks());

describe("createContentSecurityPolicy", () => {
  it("generates a fresh cryptographic nonce for each standalone policy", () => {
    const first = createContentSecurityPolicy();
    const second = createContentSecurityPolicy();
    expect(atob(first.nonce)).toHaveLength(16);
    expect(second.nonce).not.toBe(first.nonce);
    expect(directive(first.header, "script-src")).toBe(
      `script-src 'self' https://cdn.shopify.com 'nonce-${first.nonce}'`,
    );
    expect(first.header).toContain("default-src 'self';");
    expect(first.header).toContain("object-src 'none';");
    expect(first.header).toContain("script-src-attr 'none';");
    expect(directive(first.header, "script-src")).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("shares local development connection defaults between the getter and creator", () => {
    const policy = createContentSecurityPolicy({ nonce: false });
    const connectSrc = directive(policy.header, "connect-src");
    assert(connectSrc, "expected a connect-src directive");
    const otherDirectives = policy.header
      .split(";")
      .filter((part) => !part.trim().startsWith("connect-src "))
      .join(";");
    const getterSources = getShopifyCspDirectives().connectSrc;
    assert(getterSources, "expected the getter to return connection defaults");

    for (const source of DEV_CONNECTIONS) {
      expect(connectSrc.split(" ")).toContain(source);
      expect(getterSources).toContain(source);
    }
    expect(otherDirectives).not.toMatch(/localhost|127\.0\.0\.1|tryhydrogen\.dev/);
    expect(directive(policy.header, "script-src")).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it("merges custom sources before shop and development defaults", () => {
    const policy = createContentSecurityPolicy({
      shop: { storeDomain: "shop.example" },
      directives: {
        connectSrc: ["https://analytics.example", "'self'", "https://analytics.example"],
        styleSrc: ["https://styles.example", "'self'"],
        frameAncestors: ["https://frame.example"],
        imgSrc: null,
        scriptSrcElem: [],
      },
    });
    const connectSrc = directive(policy.header, "connect-src");
    expect(connectSrc).toMatch(/^connect-src https:\/\/analytics\.example 'self' /);
    expect(connectSrc?.match(/https:\/\/analytics\.example/g)).toHaveLength(1);
    expect(connectSrc).toContain("https://cdn.shopify.com");
    expect(connectSrc).toContain("https://shop.example");
    expect(connectSrc).toContain("wss://*.tryhydrogen.dev:*");
    expect(directive(policy.header, "style-src")).toBe(
      "style-src https://styles.example 'self' 'unsafe-inline' https://cdn.shopify.com",
    );
    expect(directive(policy.header, "frame-ancestors")).toBe(
      "frame-ancestors https://frame.example",
    );
    expect(directive(policy.header, "img-src")).toBeUndefined();
    expect(directive(policy.header, "script-src")).toContain(`'nonce-${policy.nonce}'`);
    expect(directive(policy.header, "script-src-elem")).toBe(
      `script-src-elem 'nonce-${policy.nonce}'`,
    );
  });

  it("retains non-none defaults for empty arrays and replaces none defaults", () => {
    const policy = createContentSecurityPolicy({
      nonce: false,
      directives: { styleSrc: [], connectSrc: [], frameAncestors: [], objectSrc: [] },
    });
    expect(directive(policy.header, "style-src")).toBe(
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    );
    expect(directive(policy.header, "connect-src")).toContain("wss://*.tryhydrogen.dev:*");
    expect(directive(policy.header, "frame-ancestors")).toBe("frame-ancestors");
    expect(directive(policy.header, "object-src")).toBe("object-src");
  });

  it("does not fall back to a non-cryptographic random generator", () => {
    vi.spyOn(crypto, "getRandomValues").mockImplementation(() => {
      throw new Error("no crypto");
    });
    const random = vi.spyOn(Math, "random");
    expect(() => createContentSecurityPolicy()).toThrow("no crypto");
    expect(random).not.toHaveBeenCalled();
  });

  it("creates a standalone nonce-free policy without reading randomness or weakening script-src", () => {
    const random = vi.spyOn(crypto, "getRandomValues");
    const policy = createContentSecurityPolicy({ nonce: false });
    expect(policy.nonce).toBeUndefined();
    expect(policy.header).not.toMatch(/'nonce-/i);
    expect(directive(policy.header, "script-src")).toBe(
      "script-src 'self' https://cdn.shopify.com",
    );
    expect(directive(policy.header, "script-src")).not.toContain("'unsafe-inline'");
    expect(random).not.toHaveBeenCalled();
    expect(Object.isFrozen(policy)).toBe(true);
  });

  it("allows explicit hashes and inline-script fallback when nonces are disabled", () => {
    const policy = createContentSecurityPolicy({
      nonce: false,
      directives: {
        scriptSrc: [
          "'self'",
          "'sha256-abcdefghijklmnopqrstuvwxyz0123456789abcdef='",
          "'unsafe-inline'",
        ],
        scriptSrcElem: ["https://scripts.example"],
      },
    });
    expect(directive(policy.header, "script-src")).toContain("'sha256-");
    expect(directive(policy.header, "script-src")).toContain("'unsafe-inline'");
    expect(directive(policy.header, "script-src-elem")).toBe(
      "script-src-elem https://scripts.example",
    );
  });

  it("permits omissions and serializes empty and boolean directives", () => {
    const { header } = createContentSecurityPolicy({
      directives: {
        styleSrc: null,
        connectSrc: ["https://api.example", "https://api.example"],
        frameSrc: null,
        sandbox: [],
        upgradeInsecureRequests: true,
      },
    });
    expect(directive(header, "style-src")).toBeUndefined();
    expect(header).not.toContain("unsafe-inline");
    expect(directive(header, "connect-src")).toMatch(/^connect-src https:\/\/api\.example 'self' /);
    expect(directive(header, "connect-src")?.match(/https:\/\/api\.example/g)).toHaveLength(1);
    expect(header).toContain("monorail");
    expect(directive(header, "frame-src")).toBeUndefined();
    expect(directive(header, "sandbox")).toBe("sandbox");
    expect(directive(header, "upgrade-insecure-requests")).toBe("upgrade-insecure-requests");
  });

  it("puts the nonce in script-src and every explicitly supplied script-src-elem", () => {
    const { header, nonce } = createContentSecurityPolicy({
      directives: { scriptSrc: [], scriptSrcElem: ["https://scripts.example"] },
    });
    expect(directive(header, "script-src")).toBe(
      `script-src 'self' https://cdn.shopify.com 'nonce-${nonce}'`,
    );
    expect(directive(header, "script-src-elem")).toBe(
      `script-src-elem https://scripts.example 'nonce-${nonce}'`,
    );
    expect(directive(header, "script-src-attr")).toBe("script-src-attr 'none'");
  });

  it("keeps script-src when null in nonce mode but otherwise omits null directives", () => {
    const withNonce = createContentSecurityPolicy({
      directives: { scriptSrc: null, scriptSrcElem: null },
    });
    expect(directive(withNonce.header, "script-src")).toBe(`script-src 'nonce-${withNonce.nonce}'`);
    expect(directive(withNonce.header, "script-src-elem")).toBeUndefined();

    const withoutNonce = createContentSecurityPolicy({
      nonce: false,
      directives: { scriptSrc: null, scriptSrcElem: null },
    });
    expect(directive(withoutNonce.header, "script-src")).toBeUndefined();
    expect(directive(withoutNonce.header, "script-src-elem")).toBeUndefined();
    expect(() =>
      createContentSecurityPolicy({ nonce: false, directives: { scriptSrc: ["'none'"] } }),
    ).toThrow(/cannot combine 'none'/);
  });

  it.each([
    "defaultSrc",
    "scriptSrc",
    "scriptSrcElem",
    "scriptSrcAttr",
    "styleSrc",
    "styleSrcElem",
    "imgSrc",
  ])("rejects manually supplied nonces in %s in both modes", (key) => {
    const directives = { [key]: [MANUAL_NONCE] };
    expect(() => createContentSecurityPolicy({ directives })).toThrow(/manually supplied nonces/);
    expect(() => createContentSecurityPolicy({ nonce: false, directives })).toThrow(
      /manually supplied nonces/,
    );
    expect(() =>
      createContentSecurityPolicy({ nonce: false, directives: { [key]: ["'NoNcE-forged'"] } }),
    ).toThrow(/manually supplied nonces/);
  });

  it.each([
    { scriptSrc: ["'none'"] },
    { scriptSrcElem: ["'NoNe'"] },
    { imgSrc: ["'none'", "https://cdn.example"] },
    { connectSrc: ["https://safe.example;script-src"] },
    { connectSrc: ["https://safe.example,default-src"] },
    { connectSrc: ["https://safe.example\n"] },
    { connectSrc: [""] },
    { "script-src;img-src": [] },
    Object.fromEntries([["__proto__", { scriptSrc: ["https://scripts.example"] }]]),
  ])("rejects malformed or contradictory directives: %j", (directives) => {
    expect(() =>
      createContentSecurityPolicy({ directives: directives as ContentSecurityPolicyDirectives }),
    ).toThrow(TypeError);
  });

  it("does not mutate source arrays while merging defaults and inserting the nonce", () => {
    const scripts = Object.freeze(["https://scripts.example"]);
    const connections = Object.freeze(["https://api.example"]);
    const directives = Object.freeze({ scriptSrc: scripts, connectSrc: connections });
    createContentSecurityPolicy({ directives });
    expect(scripts).toEqual(["https://scripts.example"]);
    expect(connections).toEqual(["https://api.example"]);
  });

  it("retains defaults for undefined directives and deduplicates shop domains", () => {
    const { header } = createContentSecurityPolicy({
      shop: { storeDomain: "shop.example", checkoutDomain: "https://shop.example" },
      directives: { defaultSrc: undefined, upgradeInsecureRequests: false },
    });
    expect(header).toContain("default-src 'self';");
    expect(header).not.toContain("upgrade-insecure-requests");
    expect(directive(header, "connect-src")?.match(/https:\/\/shop.example/g)).toHaveLength(1);
  });

  it("returns independent defaults for a framework's own CSP", () => {
    const defaults = getShopifyCspDirectives({
      storeDomain: "store.myshopify.com",
      checkoutDomain: "https://checkout.example/",
    });
    expect(defaults.connectSrc).toContain("https://store.myshopify.com");
    expect(defaults.connectSrc).toContain("https://checkout.example");
    const { header } = createContentSecurityPolicy({
      shop: { storeDomain: "store.myshopify.com" },
      directives: { connectSrc: ["https://extra.example"] },
    });
    expect(header).toContain("https://extra.example");
    expect(header).toContain("https://store.myshopify.com");
    expect(getShopifyCspDirectives().connectSrc).not.toContain("https://extra.example");
  });

  it.each([
    "http://shop.example",
    "https://user@shop.example",
    "shop.example/path",
    "shop.example?query=yes",
  ])("rejects a shop domain that is not an HTTPS origin: %s", (storeDomain) => {
    expect(() => createContentSecurityPolicy({ shop: { storeDomain } })).toThrow(TypeError);
  });
});

describe("request-context integration", () => {
  it("preserves incoming and response CSP and cache headers when no policy is registered", () => {
    const incoming = new Headers({
      [CSP]: "script-src 'nonce-attacker'",
      [CSP_REPORT_ONLY]: "default-src *",
      "x-nonce": "attacker",
    });
    const requestContext = createContext(incoming);
    const forwarded = requestContext.getForwardedRequestHeaders();
    expect(forwarded.get(CSP)).toBe(incoming.get(CSP));
    expect(forwarded.get(CSP_REPORT_ONLY)).toBe(incoming.get(CSP_REPORT_ONLY));
    expect(forwarded.get("x-nonce")).toBe("attacker");

    const response = cacheableHeaders();
    response.set(CSP, "default-src 'self'");
    response.set(CSP_REPORT_ONLY, "script-src 'none'");
    requestContext.applyResponseHeaders(response);
    expect(response.get(CSP)).toBe("default-src 'self'");
    expect(response.get(CSP_REPORT_ONLY)).toBe("script-src 'none'");
    expect(response.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.get("Oxygen-Cache-Control")).toBe("public, max-age=600");
    expect(response.get("Surrogate-Control")).toBe("max-age=600");
  });

  it.each([false, undefined] as const)(
    "ignores spoofed request CSP and overwrites it when nonce is %j",
    (nonce) => {
      const incoming = new Headers({
        [CSP]: "default-src *; script-src 'nonce-attacker' 'unsafe-inline'",
        [CSP_REPORT_ONLY]: "script-src 'nonce-attacker-report'",
        "x-nonce": "attacker",
      });
      const requestContext = createContext(incoming);
      const policy = createContentSecurityPolicy({ requestContext, nonce });
      const forwarded = requestContext.getForwardedRequestHeaders();
      expect(policy.nonce).not.toBe("attacker");
      expect(policy.header).not.toContain("attacker");
      expect(policy.header).not.toContain("default-src *");
      expect(directive(policy.header, "script-src")).not.toContain("'unsafe-inline'");
      expect(forwarded.get(CSP)).toBe(policy.header);
      expect(forwarded.has(CSP_REPORT_ONLY)).toBe(false);
      expect(incoming.get(CSP)).toContain("attacker");
      expect(incoming.get(CSP_REPORT_ONLY)).toContain("attacker-report");

      // A separate context must generate its own nonce rather than reuse the forwarded policy's.
      const downstream = createContentSecurityPolicy({ requestContext: createContext(forwarded) });
      expect(downstream.nonce).not.toBe(policy.nonce);
      expect(downstream.header).not.toContain("attacker");
    },
  );

  it("returns the same frozen object for equivalent options and isolates different requests", () => {
    const requestContext = createContext();
    const first = createContentSecurityPolicy({
      requestContext,
      shop: { storeDomain: "shop.example" },
      directives: { workerSrc: ["'self'"], childSrc: ["'self'"] },
    });
    const repeated = createContentSecurityPolicy({
      requestContext,
      shop: { storeDomain: "https://shop.example" },
      directives: { childSrc: ["'self'"], workerSrc: ["'self'"] },
    });
    expect(repeated).toBe(first);
    expect(Object.isFrozen(repeated)).toBe(true);
    expect(createContentSecurityPolicy({ requestContext: createContext() }).nonce).not.toBe(
      first.nonce,
    );
    expect(() => createContentSecurityPolicy({ requestContext })).toThrow(/already registered/);
  });

  it("reuses equivalent merged policies and preserves state after conflicting or invalid sources", () => {
    const requestContext = createContext();
    const options = {
      requestContext,
      directives: { connectSrc: ["https://analytics.example"] },
    };
    const original = createContentSecurityPolicy(options);
    expect(
      createContentSecurityPolicy({
        requestContext,
        directives: { connectSrc: ["https://analytics.example", "https://analytics.example"] },
      }),
    ).toBe(original);
    expect(() =>
      createContentSecurityPolicy({
        requestContext,
        directives: { connectSrc: ["https://different.example"] },
      }),
    ).toThrow(/already registered/);
    expect(() =>
      createContentSecurityPolicy({
        requestContext,
        directives: { connectSrc: [MANUAL_NONCE] },
      }),
    ).toThrow(/manually supplied nonces/);
    expect(createContentSecurityPolicy(options)).toBe(original);
    expect(requestContext.getForwardedRequestHeaders().get(CSP)).toBe(original.header);
  });

  it.each([false, undefined] as const)(
    "rejects conflicting options and mode changes without changing state for %j",
    (nonce) => {
      const requestContext = createContext();
      const options = { requestContext, nonce, shop: { storeDomain: "shop.example" } };
      const original = createContentSecurityPolicy(options);
      expect(createContentSecurityPolicy(options)).toBe(original);
      expect(() =>
        createContentSecurityPolicy({ ...options, directives: { connectSrc: ["*"] } }),
      ).toThrow(/already registered/);
      expect(() =>
        createContentSecurityPolicy({ ...options, nonce: nonce === false ? undefined : false }),
      ).toThrow(/already registered/);
      expect(createContentSecurityPolicy(options)).toBe(original);
      expect(requestContext.getForwardedRequestHeaders().get(CSP)).toBe(original.header);
      const response = new Headers();
      requestContext.applyResponseHeaders(response);
      expect(response.get(CSP)).toBe(original.header);
    },
  );

  it("does not return a nonce-free policy from a later default call", () => {
    const requestContext = createContext();
    const original = createContentSecurityPolicy({ requestContext, nonce: false });
    expect(() => createContentSecurityPolicy({ requestContext })).toThrow(/already registered/);
    expect(createContentSecurityPolicy({ requestContext, nonce: false })).toBe(original);
  });

  it("leaves the context unregistered when building a policy fails", () => {
    const requestContext = createContext();
    expect(() =>
      createContentSecurityPolicy({ requestContext, directives: { styleSrc: [MANUAL_NONCE] } }),
    ).toThrow(TypeError);
    const response = cacheableHeaders();
    requestContext.applyResponseHeaders(response);
    expect(response.has(CSP)).toBe(false);
    expect(response.get("Cache-Control")).toBe("public, max-age=60");
    const policy = createContentSecurityPolicy({ requestContext, nonce: false });
    requestContext.applyResponseHeaders(response);
    expect(response.get(CSP)).toBe(policy.header);
  });

  it("keeps registered policy state out of serialized and spread contexts", () => {
    const requestContext = createContext();
    const serialized = JSON.stringify(requestContext);
    const policy = createContentSecurityPolicy({ requestContext });

    expect(JSON.stringify(requestContext)).toBe(serialized);
    expect(JSON.stringify({ ...requestContext })).toBe(serialized);
    expect(createContentSecurityPolicy({ requestContext })).toBe(policy);
  });

  it("preserves the registered policy when the context is frozen and header methods are extracted", () => {
    const requestContext = createContext();
    const policy = createContentSecurityPolicy({ requestContext });
    Object.freeze(requestContext);
    const { applyResponseHeaders, getForwardedRequestHeaders } = requestContext;
    const response = cacheableHeaders();

    applyResponseHeaders(response);
    expect(response.get(CSP)).toBe(policy.header);
    expect(response.get("Cache-Control")).toBe(PRIVATE_CACHE);
    expect(getForwardedRequestHeaders().get(CSP)).toBe(policy.header);
    expect(createContentSecurityPolicy({ requestContext })).toBe(policy);
  });

  it("applies a nonce policy, preserves response report-only, and disables caches on repeated applications", () => {
    const requestContext = createContext();
    const policy = createContentSecurityPolicy({ requestContext });
    const response = cacheableHeaders();
    response.set(CSP_REPORT_ONLY, "default-src 'none'");
    requestContext.applyResponseHeaders(response);
    requestContext.applyResponseHeaders(response);
    expect(response.get(CSP)).toBe(policy.header);
    expect(response.get(CSP_REPORT_ONLY)).toBe("default-src 'none'");
    expect(response.get("Cache-Control")).toBe(PRIVATE_CACHE);
    expect(response.has("Oxygen-Cache-Control")).toBe(false);
    expect(response.has("Surrogate-Control")).toBe(false);
    expect(response.has("CDN-Cache-Control")).toBe(false);
  });

  it("preserves cache headers for a nonce-free policy on repeated applications", () => {
    const requestContext = createContext();
    const policy = createContentSecurityPolicy({ requestContext, nonce: false });
    const response = cacheableHeaders();
    response.set(CSP_REPORT_ONLY, "default-src 'none'");
    requestContext.applyResponseHeaders(response);
    requestContext.applyResponseHeaders(response);
    expect(response.get(CSP)).toBe(policy.header);
    expect(response.get(CSP_REPORT_ONLY)).toBe("default-src 'none'");
    expect(response.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.get("Oxygen-Cache-Control")).toBe("public, max-age=600");
    expect(response.get("CDN-Cache-Control")).toBe("public, s-maxage=600");
    expect(response.get("Surrogate-Control")).toBe("max-age=600");
  });

  it.each(["personalized", "cookie", "session", "consent"])(
    "keeps the existing %s privacy rule for nonce-free policies",
    (reason) => {
      const requestContext = createContext(
        new Headers(reason === "consent" ? { [CONSENT_MANAGEMENT_HEADER]: "1" } : {}),
      );
      const policy = createContentSecurityPolicy({ requestContext, nonce: false });
      const response = cacheableHeaders();
      if (reason === "personalized") requestContext.markResponseAsPersonalized("customer data");
      if (reason === "cookie") response.set("Set-Cookie", "session=1; Path=/");
      if (reason === "session") requestContext.markResponseAsSessionEstablishing("session");
      requestContext.applyResponseHeaders(response);
      expect(response.get(CSP)).toBe(policy.header);
      expect(response.get("Cache-Control")).toBe(PRIVATE_CACHE);
      expect(response.has("Oxygen-Cache-Control")).toBe(false);
      expect(response.has("CDN-Cache-Control")).toBe(false);
      expect(response.has("Surrogate-Control")).toBe(false);
    },
  );

  it.each([false, undefined] as const)(
    "rejects a conflicting response CSP without changing the response for %j",
    (nonce) => {
      const requestContext = createContext();
      createContentSecurityPolicy({ requestContext, nonce });
      const response = cacheableHeaders();
      response.set(CSP, "default-src 'none'");
      response.set(CSP_REPORT_ONLY, "script-src 'none'");
      expect(() => requestContext.applyResponseHeaders(response)).toThrow(TypeError);
      expect(response.get(CSP)).toBe("default-src 'none'");
      expect(response.get(CSP_REPORT_ONLY)).toBe("script-src 'none'");
      expect(response.get("Cache-Control")).toBe("public, max-age=60");
      expect(response.get("Oxygen-Cache-Control")).toBe("public, max-age=600");
    },
  );

  it("can register a policy after applying earlier response headers", () => {
    const requestContext = createContext();
    requestContext.applyResponseHeaders(new Headers());
    const policy = createContentSecurityPolicy({ requestContext });
    const response = new Headers();
    requestContext.applyResponseHeaders(response);
    expect(response.get(CSP)).toBe(policy.header);
  });

  it("does not add CSP to Storefront API subrequests", () => {
    const requestContext = createContext();
    createContentSecurityPolicy({ requestContext });
    const headers = new Headers();
    requestContext.applyStorefrontRequestHeaders(headers);
    expect(headers.has(CSP)).toBe(false);
    expect(headers.has(CSP_REPORT_ONLY)).toBe(false);
    expect(headers.get("X-SDK-Variant")).toBe("hydrogen");
  });
});
