# ADR 0002: Nuxt signifier coverage

- Status: Proposed change to issue #1283 (decision for PR #4184, 2026-10-15)
- Issue: [#1283](https://github.com/Shopify/developer-tools-team/issues/1283)
- Related: [ADR 0001](0001-standard-signifiers.md), [PR #4184](https://github.com/Shopify/hydrogen/pull/4184)

## Context

Issue #1283 requests a Nuxt-specific skip list for test groups blocked by signifiers that later tasks will add. Each task would remove its entries, leaving the list empty by task 10.

PR #4184 records a local production Nuxt run on 2026-10-15 with a freshly built Hydrogen package: 12 tests passed, 2 skipped for missing live data, and none failed. The PR records the tested revision and the limits of that result; the skipped tests are not passes.

## Decision

We decided not to implement the Nuxt-specific skip list requested in issue #1283. That run identified no missing-signifier failures requiring a Nuxt-specific exception.

Nuxt runs the shared storefront E2E suite without Nuxt-specific test exclusions. Existing shared test behavior is unchanged; see the [storefront contract](../storefront-contract.md).

## Plan change

This is a deliberate departure from the issue's skip-list requirement, not an implementation of it. The remaining acceptance criteria must still be verified separately.

## Consequences

- There is no Nuxt-specific exception mechanism to maintain.
- If a Nuxt-specific gap is found later, it must be evaluated then rather than excluded in advance.
