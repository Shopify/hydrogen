# Storefront E2E

Portable Playwright suite for testing an already-running Hydrogen storefront example or generated storefront.

Run with:

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

See docs/storefront-contract.md for the required storefront contract, diagnostics, checkout boundary, and operational assumptions.

## Scenario verification core

The package also contains browser-independent parts for agent-driven storefront tests:

- A tokenless Storefront API client that checks the requested country and language.
- Bounded catalog discovery that pins one purchasable variant.
- An add-to-cart assertion that verifies the pinned variant through the API, not page text.
- A runner that accepts a buyer and browser driver through explicit interfaces.
- Redacted evidence, JSON run artifacts, and a terminal summary.

The assertion requires exactly one unit of the pinned variant. Other cart lines are allowed and reported. API proof passes independently of the buyer's claim. A wrong cart state is a storefront failure only after a confirmed add attempt; an inconclusive agent attempt stays indeterminate.

This core does not start a browser or model by itself. The existing Playwright suite is unchanged.

Run the package's unit tests without a browser or model:

```sh
pnpm --filter @shopify/storefront-e2e test:unit
```
