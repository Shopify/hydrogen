import { describe, expect, it } from "vitest";

import { escapeXml, renderSitemapIndex, renderSitemapUrlSet } from "./xml";

describe("sitemap xml", () => {
  it("escapes reserved characters", () => {
    expect(escapeXml(`a&b<c>"d'e`)).toBe("a&amp;b&lt;c&gt;&quot;d&apos;e");
  });

  it("renders a sitemap index", () => {
    expect(
      renderSitemapIndex([
        { loc: "https://example.com/sitemap/products/1.xml" },
        { loc: "https://example.com/custom.xml?a=1&b=2", lastmod: "2026-01-01T00:00:00Z" },
      ]),
    ).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap/products/1.xml</loc></sitemap>
  <sitemap><loc>https://example.com/custom.xml?a=1&amp;b=2</loc><lastmod>2026-01-01T00:00:00Z</lastmod></sitemap>
</sitemapindex>
`,
    );
  });

  it("renders a urlset without the xhtml namespace when no alternates exist", () => {
    const xml = renderSitemapUrlSet([{ loc: "https://example.com/products/a" }]);

    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).not.toContain("xmlns:xhtml");
    expect(xml).toContain("<url>\n    <loc>https://example.com/products/a</loc>\n  </url>");
  });

  it("renders lastmod, changefreq, and alternates", () => {
    const xml = renderSitemapUrlSet([
      {
        loc: "https://example.com/products/a",
        lastmod: "2026-01-01T00:00:00Z",
        changefreq: "weekly",
        alternates: [
          { hrefLang: "en-US", href: "https://example.com/products/a" },
          { hrefLang: "fr-CA", href: "https://example.com/fr-ca/products/a" },
        ],
      },
    ]);

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain("<lastmod>2026-01-01T00:00:00Z</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="fr-CA" href="https://example.com/fr-ca/products/a" />',
    );
  });
});
