# customer-api

## 0.0.2

### Patch Changes

- Sync up environment variable names across all example & type files. ([#1542](https://github.com/Shopify/hydrogen/pull/1542)) by [@michenly](https://github.com/michenly)

- Update all Node.js dependencies to version 18. (Not a breaking change, since Node.js 18 is already required by Remix v2.) ([#1543](https://github.com/Shopify/hydrogen/pull/1543)) by [@michenly](https://github.com/michenly)

- Update the return types of the Customer Account API query and mutation methods. Also update Customer Account API default version to 2024-01. ([#1537](https://github.com/Shopify/hydrogen/pull/1537)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`b2a350a7`](https://github.com/Shopify/hydrogen/commit/b2a350a754ea2d29bc267c260dc298a02f8f4470), [`9b4f4534`](https://github.com/Shopify/hydrogen/commit/9b4f453407338874bd8f1a1f619b607670e021d0), [`74ea1dba`](https://github.com/Shopify/hydrogen/commit/74ea1dba9af37a146882df7ed9674be5659862b5), [`2be9ce82`](https://github.com/Shopify/hydrogen/commit/2be9ce82fd4a5121f1772bbb7349e96ed530e84e), [`a9b8bcde`](https://github.com/Shopify/hydrogen/commit/a9b8bcde96c22cedef7d87631d429199810b4a7a), [`bca112ed`](https://github.com/Shopify/hydrogen/commit/bca112ed7db49e533fe49898b663fa0dd318e6ba), [`848c6260`](https://github.com/Shopify/hydrogen/commit/848c6260a2db3a9cb0c86351f0f7128f61e028f0), [`d53b4ed7`](https://github.com/Shopify/hydrogen/commit/d53b4ed752eb0530622a666ea7dcf4b40239cafa), [`961fd8c6`](https://github.com/Shopify/hydrogen/commit/961fd8c630727784f77b9f693d2e8ff8601969fc), [`2bff9fc7`](https://github.com/Shopify/hydrogen/commit/2bff9fc75916fa95f9a9279d069408fb7a33755c), [`c8e8f6fd`](https://github.com/Shopify/hydrogen/commit/c8e8f6fd233e52cf5570b1904af710d6b907aae5), [`8fce70de`](https://github.com/Shopify/hydrogen/commit/8fce70de32bd61ee86a6d895ac43cc1f78f1bf49), [`f90e4d47`](https://github.com/Shopify/hydrogen/commit/f90e4d4713c6c1fc1e921a7ecd08e95fe5da1744), [`e8cc49fe`](https://github.com/Shopify/hydrogen/commit/e8cc49feff18f5ee72d5f6965ff2094addc23466)]:
  - @shopify/cli-hydrogen@6.1.0
  - @shopify/remix-oxygen@2.0.2
  - @shopify/hydrogen@2023.10.3

## 1.0.0

### Breaking changes

- The Customer Account API example now uses an API client [included with Hydrogen](https://shopify.dev/docs/api/hydrogen/2023-10/utilities/createcustomerclient) (#38507) by @blittle.
