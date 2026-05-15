---
name: hydrogen-core-docs
description: >
  Guide for working with framework-agnostic core utilities
  shared across Hydrogen.
  Use when importing from `@shopify/hydrogen/core` or `@shopify/hydrogen-core`.
---

# @shopify/hydrogen-core

`@shopify/hydrogen-core` provides framework-agnostic core utilities shared across the Hydrogen ecosystem. It can also be used from `@shopify/hydrogen` using the `core` entrypoint.

## Public API

### Mock Shop Utilities

- `MOCK_SHOP_DOMAIN` — The domain string for Shopify's mock shop
- `isMockShop(domain: string): boolean` — Returns `true` if the given domain contains the mock shop domain

## Architecture

This package is the lowest layer in the Hydrogen package hierarchy. It contains utilities that:

- Have **no framework dependencies** (no React, no Remix, no Node-specific APIs)
- Are shared by multiple Hydrogen packages (e.g., `@shopify/hydrogen`, `@shopify/cli-hydrogen`)
- Need to be independently testable and tree-shakeable
