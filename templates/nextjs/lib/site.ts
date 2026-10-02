/**
 * Trusted site origin for SEO. Comes from a `SITE_ORIGIN` environment variable,
 * never from attacker-influenceable
 * `host` / `x-forwarded-host` request headers. Defaults to the local dev origin
 * (Next.js dev port 3000) so the example works without extra config.
 */
export const SITE_ORIGIN =
  typeof process !== "undefined"
    ? (process.env.SITE_ORIGIN ?? "http://localhost:3000")
    : "http://localhost:3000";

/** Build an absolute canonical URL from a path. */
export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}
