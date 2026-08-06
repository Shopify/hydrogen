export const DEFAULT_SITE_ORIGIN = "http://localhost:5173";

export function canonicalUrl(path: string, siteOrigin = DEFAULT_SITE_ORIGIN): string {
  return new URL(path, siteOrigin).toString();
}

export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
