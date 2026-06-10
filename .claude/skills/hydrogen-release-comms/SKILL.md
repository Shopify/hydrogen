---
name: hydrogen-release-comms
description: >
  Write blog posts and changelog entries for Hydrogen releases. Covers the two publication
  destinations (shopify.dev/changelog and hydrogen.shopify.dev/updates), content management
  via Shopify admin, and writing style guidelines.
  Use when publishing release communications, writing blog posts for a new Hydrogen version,
  or when someone mentions "blog post", "changelog post", "release announcement", "hydrogen updates",
  "shopify.dev changelog", or "hydrogen-hub".
---

# Hydrogen Release Communications

After a major Hydrogen release ships to npm, two blog posts communicate the release to developers:

1. **Shopify Dev Changelog** — `shopify.dev/changelog`
2. **Hydrogen Updates** — `hydrogen.shopify.dev/updates`

## When to Post

**Major CalVer releases only** (X.Y.0) — not patch releases (X.Y.1+).

| Release Type | Example | Blog Post? |
|--------------|---------|------------|
| Major quarterly | 2026.4.0 | Yes |
| Patch fix | 2026.4.1 | No |
| Back-fix | 2025.10.2 | No (unless significant) |
| Special announcement | N/A | Rare — e.g., "Headless Commerce meets AI" (Dec 2025) |

## Title Convention

**The title month matches the API version, not the release date.**

| Version | Title | Release Date |
|---------|-------|--------------|
| 2026.4.0 | April 2026 Release | April 9, 2026 |
| 2026.1.0 | January 2026 Release | February 9, 2026 |
| 2025.10.0 | October 2025 Release | January 30, 2026 |
| 2025.7.0 | September 2025 Release | September 30, 2025 |

The delay between API version month and release date varies — sometimes same month, sometimes weeks later.

## Content Management

Both destinations are managed via the **hydrogen-hub** Shopify store:

- **Store URL**: https://app.shopify.com/services/internal/shops/59848228886
- **Admin**: https://admin.shopify.com/store/hydrogen-hub/content/articles?selectedView=all

Create articles in the Shopify admin. The content syncs to both destinations.

## The Two Destinations

### 1. Shopify Dev Changelog (`shopify.dev/changelog`)

**Purpose**: Brief announcement in the unified Shopify changelog feed.

**Format**:
- Title: `Hydrogen {Month} {Year} Release`
- Body: 1-2 sentence summary of key changes
- Link: "Read full post" pointing to hydrogen.shopify.dev/updates

**Example**:
> **Hydrogen April 2026 Release**
> The release updates to Storefront API version 2026-04, mandates the Storefront API proxy, and introduces backend consent mode to supplant the `_tracking_consent` cookie.
> [Read full post →]

### 2. Hydrogen Updates (`hydrogen.shopify.dev/updates`)

**Purpose**: Detailed blog post for developers upgrading or evaluating Hydrogen.

**Format**:
- Title: `{Month} {Year} Release`
- Subtitle: `v{version}` (e.g., `v2026.4.0`)
- Date: Release date
- Body: Narrative with sections, code examples, and migration guidance

## Writing Style

**Tone**: Technical but accessible. Feature-focused, not changelog-focused.

**Structure for major releases**:
1. **Opening paragraph** — What's the headline change? Why does it matter?
2. **Key features** — 2-4 sections, each with:
   - What it does
   - Why it matters
   - Code example (if applicable)
3. **Breaking changes** — Clear migration guidance
4. **API version bump** — If applicable, link to API changelogs
5. **Upgrade instructions** — Point to `h2 upgrade` command

**Do**:
- Lead with developer benefit, not technical implementation
- Include runnable code examples
- Link to relevant docs and API changelogs
- Use quotes to highlight key changes

**Don't**:
- Copy-paste the GitHub release notes verbatim
- List every patch change
- Use internal jargon

## From GitHub Release to Blog Post

The GitHub release contains technical changelog entries. Transform them:

**GitHub Release (technical)**:
```markdown
### Major Changes
- Make Storefront API proxy mandatory and enable backend consent mode,
  supporting the deprecation of the `_tracking_consent` cookie...
  - **Breaking**: `proxyStandardRoutes` option has been removed...
```

**Blog Post (narrative)**:
```markdown
## Mandatory Storefront API Proxy

The Storefront API proxy is now always enabled. The `proxyStandardRoutes`
option has been removed from `createRequestHandler`.

This change enables backend consent mode—server-side cookie handling that
replaces the legacy `_tracking_consent` JavaScript cookie. Your storefront
now handles consent tracking without client-side scripts.

**Migration**: If you were explicitly setting `proxyStandardRoutes: true`,
remove the option. If you were setting it to `false`, you'll need to update
your consent handling strategy.
```

## Checklist

Before publishing:

- [ ] Title follows format: `{Month} {Year} Release`
- [ ] Version number in subtitle matches npm release
- [ ] Date matches GitHub release date
- [ ] All breaking changes have migration guidance
- [ ] Code examples are tested and runnable
- [ ] Links to API changelogs are correct and working
- [ ] `h2 upgrade` command mentioned for upgrade path

## Historical Examples

Reference these for style and scope:

### April 2026 Release (v2026.4.0)
**Key topics**: Mandatory Storefront API proxy, backend consent mode, 128KB JSON metafield limit, new cart error codes
**Type**: Breaking change + new feature release
**Style**: Led with the breaking change, explained migration path

### January 2026 Release (v2026.1.0)  
**Key topics**: Quarterly API version bump only
**Type**: Minimal changes release
**Style**: Brief — acknowledged no Hydrogen-specific features, linked to API changelogs

### October 2025 Release (v2025.10.0)
**Key topics**: `cart.addGiftCardCodes`, `cart.replaceDeliveryAddresses`, `@inContext` with `visitorConsent`
**Type**: New cart features release
**Style**: Feature-focused with code examples for each mutation

### September 2025 Release (v2025.7.0)
**Key topics**: React Router 7, Miniflare v3, USDC currency, Hydrogen Cookbook, 10 new extension methods
**Type**: Major feature release
**Style**: Comprehensive with multiple sections, code examples, and migration guidance

### December 2025 Special Update (no version)
**Key topics**: "Headless Commerce meets AI" — AI assistant shopping experiences
**Type**: Special announcement (not tied to a release)
**Style**: Marketing-forward, not technical changelog

## Related Skills

- `hydrogen-release-process` — The npm release flow that precedes these posts
- `hydrogen-versioning` — CalVer semantics and version support policies
