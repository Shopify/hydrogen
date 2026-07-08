/**
 * Trusted site origin for SEO (engineering.md F6/F10). Comes from a
 * `PUBLIC_SITE_ORIGIN` environment variable, never from attacker-influenceable
 * `host` / `x-forwarded-host` request headers. Defaults to the local dev origin
 * (Next.js dev port 3000) so the example works without extra config.
 */
export const SITE_ORIGIN =
  typeof process !== "undefined"
    ? (process.env.PUBLIC_SITE_ORIGIN ?? "http://localhost:3000")
    : "http://localhost:3000";

/** Build an absolute canonical URL from a path. */
export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

/**
 * Serialize JSON-LD and escape it for safe embedding in a `<script type="application/ld+json">`
 * tag (engineering.md F6). This is an app-owned helper — it is NOT a Hydrogen
 * export. It escapes `<` and `</script>` so the payload cannot break out of the
 * script element.
 */
export function jsonLdScript(data: object): string {
  const json = JSON.stringify(data);
  const escaped = json.replace(/</g, "\\u003c").replace(/<\/script>/gi, "\\u003c/script\\u003e");
  return escaped;
}
