# ADR 0002: Nuxt signifier coverage

- Status: Accepted (2026-10-15)
- Issue: [#1283](https://github.com/Shopify/developer-tools-team/issues/1283)
- Related: [ADR 0001](0001-standard-signifiers.md), [PR #4184](https://github.com/Shopify/hydrogen/pull/4184)

## Context

Issue #1283 planned one central file that lists the test groups Nuxt may skip because of missing future signifiers. The plan expected that list to be empty at the end.

The one-time [Nuxt baseline in PR #4184](https://github.com/Shopify/hydrogen/pull/4184#nuxt-baseline-by-group) found no Nuxt-only failure for future signifiers or Vue form bindings. The list was empty at capture. The only two skips came from live-data prerequisites. That capture ran on the old prerequisite, before the signifier rename. It is a historical record, not a run of the current contract.

## Decision

- Remove the unused central list. Do not keep it as an empty placeholder.
- Nuxt runs the same tests as the other reference storefronts. There are no Nuxt-only exclusions, listed or hidden.
- A future signifier regression on Nuxt must fail. It must not pass silently through a Nuxt-only exclusion. To add a Nuxt-only exception later, amend this record first.

These skips stay. They are not signifier exceptions, and they are not passes:

- Live-data prerequisite skips, for example no finite-stock product or no narrowing filter. The report shows the reason.
- Optional route skips, as the [storefront contract](../storefront-contract.md#routes) describes.
- The explicit `STOREFRONT_SKIP_NO_JS_VARIANTS=true` opt-out. A target sets it deliberately. The Nuxt reference runs with it set to `false`.

## Plan change

This decision replaces the skip-list plan in issue #1283. The issue text was not edited. This record does not claim that all acceptance criteria of the issue are met.

## Consequences

- One less file and code path. No central list can hide a Nuxt failure.
- If a Nuxt-only signifier gap appears, the Nuxt run fails until the storefront is fixed or this record is amended.
