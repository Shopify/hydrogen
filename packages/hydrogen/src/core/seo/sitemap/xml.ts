import type { LanguageAlternate } from "../types";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escapes text for an XML element or attribute value. */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  alternates?: readonly LanguageAlternate[];
};

/** Renders a `<sitemapindex>` document from child sitemap URLs. */
export function renderSitemapIndex(locs: readonly string[]): string {
  const body = locs.map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join("\n");

  return `${XML_DECLARATION}\n<sitemapindex xmlns="${SITEMAP_NS}">\n${body}\n</sitemapindex>\n`;
}

/** Renders a `<urlset>` document, adding the xhtml namespace when any URL has alternates. */
export function renderSitemapUrlSet(entries: readonly SitemapUrlEntry[]): string {
  const hasAlternates = entries.some((entry) => entry.alternates && entry.alternates.length > 0);
  const namespaces = hasAlternates
    ? `xmlns="${SITEMAP_NS}" xmlns:xhtml="${XHTML_NS}"`
    : `xmlns="${SITEMAP_NS}"`;
  const body = entries.map(renderUrl).join("\n");

  return `${XML_DECLARATION}\n<urlset ${namespaces}>\n${body}\n</urlset>\n`;
}

function renderUrl(entry: SitemapUrlEntry): string {
  const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  if (entry.changefreq) lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
  for (const alternate of entry.alternates ?? []) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hrefLang)}" href="${escapeXml(alternate.href)}" />`,
    );
  }
  lines.push(`  </url>`);
  return lines.join("\n");
}
