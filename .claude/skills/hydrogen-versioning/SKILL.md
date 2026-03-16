---
name: hydrogen-versioning
description: >
  Versioning reference for Hydrogen and Shopify's GraphQL APIs. Covers CalVer formats,
  quarterly release schedules, version support policies, and release cadence expectations.
  Use when discussing hydrogen calver, calver, SFAPI version, API version support,
  hydrogen release cadence, version support window, unstable API version, storefront API
  version, or customer account API version. Also activates when planning a Hydrogen major
  release, answering merchant questions about API version compatibility, or determining
  which versions are currently supported.
---

# Hydrogen & Shopify API Versioning

Reference for all versioning schemes in the Hydrogen ecosystem. For release *process* (how to actually ship a release), see `hydrogen-release-process`. For domain architecture context, see `headless-storefronts-context`.

## Shopify GraphQL API Versioning

Shopify's GraphQL APIs (Storefront API, Customer Account API, Admin API) all use the same calendar versioning scheme.

### Format: `YYYY-MM`

- Uses **hyphens**, not dots
- No trailing `.0` — the version is just `YYYY-MM`
- Examples: `2025-01`, `2025-04`, `2025-07`, `2025-10`

### Quarterly Release Schedule

Four versions are released per year, always on the **1st of the release month**:

| Quarter | Version | Release Date |
|---------|---------|--------------|
| Q1 | `YYYY-01` | January 1 |
| Q2 | `YYYY-04` | April 1 |
| Q3 | `YYYY-07` | July 1 |
| Q4 | `YYYY-10` | October 1 |

### The `unstable` Version

An `unstable` version always exists alongside the CalVer versions. It is the bleeding edge:

- New features land in `unstable` first, then in a specific CalVer version once verified
- Breaking changes can happen at any time in `unstable`
- **Not for production use** — only for previewing upcoming features

### Release Candidates

The upcoming CalVer version's release candidate becomes available ~3 months before its official release (it ships on the same day as the current quarter's stable release).

Example timeline for `2026-04`:
- **January 1, 2026**: `2026-01` is officially released. Simultaneously, the `2026-04` release candidate becomes available.
- **~March 18, 2026**: Breaking changes to the `2026-04` RC are generally frozen.
- **April 1, 2026**: `2026-04` is officially released.

**Note on the RC freeze**: The ~2-week freeze before release is **internal policy, not publicly documented**. In rare cases, breaking changes to the RC may still be permitted with SLT approval. Do not cite this freeze window as an official guarantee to merchants or external parties.

### Developer Changelog

API changes in each new version are posted in the [Shopify developer changelog](https://shopify.dev/changelog). Check this when planning Hydrogen upgrades to understand what changed.

## Hydrogen CalVer Versioning

Hydrogen uses a **different** CalVer format than Shopify's GraphQL APIs.

### Format: `YYYY.MAJOR.MINOR`

- Uses **dots**, not hyphens (unlike Storefront API (SF API) versions)
- **YYYY** = calendar year
- **MAJOR** = the Storefront API release month (`1`, `4`, `7`, `10`) — NOT a sequential counter
- **MINOR** = minor/patch number within that major release

Examples:
- `2025.7.0` = year 2025, aligned with SF API `2025-07`, first release of that major
- `2025.7.3` = third patch of the `2025.7.x` line
- `2026.1.0` = year 2026, aligned with SF API `2026-01`

**Historical anomaly: `2025.5.x`**: Hydrogen versions `2025.5.0` and `2025.5.1` are the first and (so far) only releases outside the standard quarterly pattern. These were released to ship breaking/major changes between SF API version updates. There are no current plans to do this again — in general, breaking/major changes are timed to coincide with SF API version updates. However, an off-cycle major release could be warranted in the future if significant breaking changes need to ship between quarterly API updates.

### Tied to Storefront API / Customer Account API (CA API)

- Hydrogen releases a **new major version** with every SF API/CA API version update, regardless of whether there are breaking changes in the APIs
- Breaking changes in Hydrogen are possible every 3 months with these API updates

### Deriving Hydrogen Versions (Formula)

SF API releases quarterly as `YYYY-MM`. Each SF API release triggers a corresponding Hydrogen major:

```
SF API YYYY-MM  →  Hydrogen YYYY.M.0
```

Where `M` is the month number without zero-padding: `01` → `1`, `04` → `4`, `07` → `7`, `10` → `10`.

## Version Support Policy

Both Hydrogen packages and Shopify GraphQL APIs follow the same support policy:

- **365-day minimum support window** from release date (Shopify-wide standard)
- After 365 days, a version may be sunset — but Shopify must provide at least 365 days of notice before any breaking change or sunset takes effect

### Fall-Forward for Expired SF API Versions

When a requested SF API version is >365 days old, requests are **not rejected**. Instead, they are automatically served by the **oldest currently-supported version** (which is a *newer* version than what was requested). This is called "fall-forward."

**Example**: In May 2026, the valid SF API versions are:

| Version | Released | Still Valid? |
|---------|----------|-------------|
| `2025-07` | Jul 1, 2025 | Yes (oldest valid) |
| `2025-10` | Oct 1, 2025 | Yes |
| `2026-01` | Jan 1, 2026 | Yes |
| `2026-04` | Apr 1, 2026 | Yes (newest) |

A request for `2024-10` (expired) would be served by `2025-07` (the oldest valid version). The merchant would silently get newer API behavior, which could include breaking changes.

Currently 4 valid versions exist at any time (not counting `unstable`). This is a natural consequence of quarterly releases + 365-day support window.

### Practical Implications

- If no breaking changes or sunsets affect a merchant's specific API operations, they may not need to take action even after their version expires — but upgrading is still recommended
- When a merchant reports "my storefront broke and I didn't change anything," check whether their requested API version recently fell forward to a newer one that may have breaking changes for their use case

## Release Cadence Expectations

Hydrogen aims to support new SF API versions promptly after release.

### create-hydrogen Versioning

The package is **`@shopify/create-hydrogen`** (scoped) — not the legacy unscoped `create-hydrogen` which stopped at 4.3.14 in mid-2024. It uses **SemVer**, not Hydrogen CalVer, so `npm create @shopify/hydrogen@2025.7.0` will not work as-is. There is no direct version correspondence — a lookup step is required.

**How npm `create` resolves the package**: `npm create @shopify/hydrogen@VERSION` invokes `@shopify/create-hydrogen@VERSION` under the hood — npm prepends `create-` to scoped packages.

**Lookup technique** — find which `@shopify/create-hydrogen` SemVer maps to a target Hydrogen CalVer:

```bash
gh api repos/Shopify/hydrogen/releases --paginate \
  --jq '.[] | select(.tag_name | test("create-hydrogen|@shopify/hydrogen@TARGET")) | {tag: .tag_name, date: .published_at}'
```

Replace `TARGET` with the Hydrogen CalVer (e.g., `2025.7.0`). The `create-hydrogen` release published within seconds of the Hydrogen release is the correct match.

**Known version mappings** (confirmed from GitHub release timestamps):

| Hydrogen CalVer | `@shopify/create-hydrogen` | Released |
|-----------------|---------------------------|----------|
| `2025.7.0` | `5.0.25` | 2025-09-30 |

**Scaffold command for a specific version**:
```bash
npm create @shopify/hydrogen@5.0.25  # scaffolds Hydrogen 2025.7.0 skeleton
```

## Related Skills

- `hydrogen-release-process` — Release process, back-fixes, changelog.json, release failure recovery
- `hydrogen-dev-workflow` — Day-to-day development workflow, testing, recipes, CLI tooling
