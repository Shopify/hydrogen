---
"@shopify/mini-oxygen": minor
"@shopify/create-hydrogen": patch
"@shopify/hydrogen-react": patch
"@shopify/cli-hydrogen": patch
"skeleton": patch
---

Upgrade Miniflare from v2 to v4 in mini-oxygen package.

- **Breaking**: Internal MiniOxygen API has been refactored to work with Miniflare v4's new architecture.
- Simplified MiniOxygen class - no longer extends MiniflareCore.
- Updated global fetch handling to use Miniflare v4's `outboundService` API.
- Fixed test infrastructure to use project-relative temporary directories.
- Added support for Oxygen compatibility parameters (`compatibilityDate`, `compatibilityFlags`).
- Removed dependency on multiple `@miniflare/*` packages in favor of the consolidated `miniflare` package.