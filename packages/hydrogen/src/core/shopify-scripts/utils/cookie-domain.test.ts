import { describe, it, expect } from "vitest";

import { findWritableCookieDomain } from "./cookie-domain";

describe("findWritableCookieDomain", () => {
  it("returns empty string for localhost", () => {
    expect(findWritableCookieDomain("localhost")).toBe("");
  });

  it("returns empty string for IP addresses", () => {
    expect(findWritableCookieDomain("127.0.0.1")).toBe("");
    expect(findWritableCookieDomain("::1")).toBe("");
  });

  it("normalizes protocol, port, path, and leading dot", () => {
    const probes: string[] = [];
    const result = findWritableCookieDomain("https://www.example.com:8443/path", (domain) => {
      probes.push(domain);
      return domain === ".example.com";
    });

    expect(result).toBe(".example.com");
    expect(probes).toEqual([".example.com"]);
  });

  it("probes from broadest to narrowest viable domain", () => {
    const probes: string[] = [];
    const result = findWritableCookieDomain("shop.checkout.example.co.uk", (domain) => {
      probes.push(domain);
      return domain === ".example.co.uk";
    });

    expect(result).toBe(".example.co.uk");
    expect(probes).toEqual([".co.uk", ".example.co.uk"]);
  });

  it("returns empty string when every probe fails", () => {
    expect(findWritableCookieDomain("www.example.com", () => false)).toBe("");
  });
});
