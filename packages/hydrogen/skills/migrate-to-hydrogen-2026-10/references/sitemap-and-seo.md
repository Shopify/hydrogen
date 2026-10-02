# Sitemap & SEO traps

Read if the source has `sitemap.xml`/`robots.txt` routes or a `seo` export.

- **Sitemaps: `getSitemap`/`getSitemapIndex` are gone.** The 2026-10 library does not ship them, and the classic versions were typed for the classic `Storefront` client (`.query`) — the new request-scoped client only exposes `.graphql`, so they don't port. Write a small local `app/lib/sitemap.ts` that runs the sitemap queries via `storefront.graphql` and preserves any custom URL transforms (renamed routes, locale prefixes). The route files then call the local lib.
