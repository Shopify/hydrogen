import { describe, expect, it } from "vitest";

import { createRobotsTxt } from "./robots";

const ORIGIN = "https://example.com";

describe("createRobotsTxt", () => {
  it("emits the default groups and sitemap line", () => {
    const body = createRobotsTxt({ origin: ORIGIN });

    expect(body).toMatch(/^# Shopify Hydrogen storefront/);
    expect(body).toContain(`# UCP/MCP endpoint: ${ORIGIN}/api/ucp/mcp`);
    expect(body).toContain(`# Storefront MCP endpoint: ${ORIGIN}/api/mcp`);
    expect(body).toContain(
      "User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /cart/\nDisallow: /search\n",
    );
    expect(body).toContain("Disallow: /admin\n");
    expect(body).toContain("Disallow: /checkout\n");
    expect(body).toContain("Disallow: /account\n");
    expect(body).toContain("Allow: /account/login\n");
    expect(body).toContain("Disallow: /api/\n");
    expect(body).toContain("Disallow: /__shopify/\n");
    expect(body).toContain("Disallow: /collections/*sort_by*\n");
    expect(body).toContain("Disallow: /blogs/*+*\n");
    expect(body).toContain("Disallow: /*?*preview_theme_id=*\n");
    expect(body).toContain("User-agent: adsbot-google\nAllow: /products/\nAllow: /collections/\n");
    expect(body).toMatch(/Sitemap: https:\/\/example\.com\/sitemap\.xml\n$/);
    expect(body).not.toContain("/*/cart");
  });

  it("derives paths from route templates", () => {
    const body = createRobotsTxt({
      origin: ORIGIN,
      routeTemplates: {
        cart: "/basket",
        search: "/find",
        collection: "/c/:collectionHandle",
        blog: "/journal/:blogHandle",
        product: "/p/:productHandle",
      },
    });

    expect(body).toContain("Disallow: /basket\nDisallow: /basket/\nDisallow: /find\n");
    expect(body).toContain("Disallow: /c/*sort_by*\n");
    expect(body).toContain("Disallow: /journal/*+*\n");
    expect(body).toContain("User-agent: adsbot-google\nAllow: /p/\nAllow: /c/\n");
    expect(body).not.toContain("Disallow: /cart\n");
  });

  it("adds locale wildcard variants when any locale has a path prefix", () => {
    expect(createRobotsTxt({ origin: ORIGIN, locales: [{ hrefLang: "en-US" }] })).not.toContain(
      "/*/cart",
    );

    const body = createRobotsTxt({
      origin: ORIGIN,
      locales: [{ hrefLang: "en-US" }, { hrefLang: "fr-CA", pathPrefix: "/fr-ca" }],
    });

    expect(body).toContain("Disallow: /cart\nDisallow: /*/cart\n");
    expect(body).toContain("Allow: /account/login\nAllow: /*/account/login\n");
    expect(body).toContain("Disallow: /*/collections/*sort_by*\n");
  });

  it("appends custom rules, groups, and sitemap path", () => {
    const body = createRobotsTxt({
      origin: `${ORIGIN}/ignored/path`,
      sitemapPath: "/sitemaps/index.xml",
      disallow: ["/internal/"],
      allow: ["/internal/public"],
      additionalGroups: [{ userAgent: "AhrefsBot", rules: [{ directive: "Disallow", path: "/" }] }],
    });

    expect(body).toContain("Disallow: /internal/\nAllow: /internal/public\n");
    expect(body).toContain("User-agent: AhrefsBot\nDisallow: /\n");
    expect(body).toMatch(/Sitemap: https:\/\/example\.com\/sitemaps\/index\.xml\n$/);
  });

  it("omits agent comments when disabled and adds instructions when given", () => {
    expect(createRobotsTxt({ origin: ORIGIN, agents: false })).toMatch(/^User-agent: \*/);
    expect(
      createRobotsTxt({ origin: ORIGIN, agents: { instructionsPath: "/agents.md" } }),
    ).toContain(`# Agent instructions: ${ORIGIN}/agents.md`);
  });
});
