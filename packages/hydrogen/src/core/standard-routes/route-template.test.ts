import { describe, expect, it } from "vitest";

import {
  compileRouteTemplate,
  getRouteTemplateParamNames,
  interpolateRouteTemplate,
  isRouteTemplate,
  matchRouteTemplate,
} from "./route-template";

function match(template: string, pathname: string) {
  return matchRouteTemplate(compileRouteTemplate(template), pathname);
}

describe("route templates", () => {
  it("lists param names in order", () => {
    expect(getRouteTemplateParamNames("/sitemap/:type/:page.xml")).toEqual(["type", "page"]);
    expect(getRouteTemplateParamNames("/sitemap.xml")).toEqual([]);
    expect(isRouteTemplate("/sitemap/:type/:page.xml")).toBe(true);
    expect(isRouteTemplate("/sitemap.xml")).toBe(false);
  });

  it("captures segments and literal suffixes", () => {
    expect(match("/sitemap/:type/:page.xml", "/sitemap/products/12.xml")).toEqual({
      type: "products",
      page: "12",
    });
  });

  it("decodes captured segments", () => {
    expect(match("/items/:handle", "/items/caf%C3%A9")).toEqual({ handle: "café" });
  });

  it("does not match across segments or without the suffix", () => {
    expect(match("/sitemap/:type/:page.xml", "/sitemap/products/1")).toBeNull();
    expect(match("/sitemap/:type/:page.xml", "/sitemap/a/b/1.xml")).toBeNull();
  });

  it("treats regex characters in templates literally", () => {
    expect(match("/feed.:format", "/feedXjson")).toBeNull();
    expect(match("/feed.:format", "/feed.json")).toEqual({ format: "json" });
  });

  it("keeps placeholders rejected by the param filter as literal text", () => {
    const pattern = compileRouteTemplate(
      "/p/:productHandle/:other",
      (name) => name === "productHandle",
    );

    expect(matchRouteTemplate(pattern, "/p/snowboard/:other")).toEqual({
      productHandle: "snowboard",
    });
    expect(matchRouteTemplate(pattern, "/p/snowboard/x")).toBeNull();
  });

  it("interpolates and encodes params, leaving unknown ones literal", () => {
    expect(
      interpolateRouteTemplate("/sitemap/:type/:page.xml", { type: "products", page: "2" }),
    ).toBe("/sitemap/products/2.xml");
    expect(interpolateRouteTemplate("/c/:collectionHandle", { collectionHandle: "a b" })).toBe(
      "/c/a%20b",
    );
    expect(
      interpolateRouteTemplate("/c/:collectionHandle/:missing", { collectionHandle: "x" }),
    ).toBe("/c/x/:missing");
  });
});
