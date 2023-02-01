# @shopify/hydrogen

## 2022.1.0-alpha.1

### Patch Changes

- Use new versioning schema by [@jplhomer](https://github.com/jplhomer)

## 2.0.0-alpha.4

### Patch Changes

- Use the new version of GraphiQL instead of GraphQL Playground ([#410](https://github.com/Shopify/h2/pull/410)) by [@jplhomer](https://github.com/jplhomer)

## 2.0.0-alpha.3

### Patch Changes

- - Upgrade to the latest Remix experimental defer release, 1.11.0 ([#371](https://github.com/Shopify/h2/pull/371)) by [@blittle](https://github.com/blittle)

  - Replace redundant i18n routes with a single root optional route segment `($lang)`

- Update RSK package ([#369](https://github.com/Shopify/h2/pull/369)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.0-alpha.2

### Patch Changes

- Add a default value for `context.storefront.i18n` and improve types. ([#330](https://github.com/Shopify/h2/pull/330)) by [@frandiox](https://github.com/frandiox)

- Rename the `notFoundMaybeRedirect` utility to `storefrontRedirect` and call it only in the server entry file. ([#362](https://github.com/Shopify/h2/pull/362)) by [@frandiox](https://github.com/frandiox)

- Removed magic routes and `.hydrogen` template routes. See `rfc/obsolete-routing.md` for details of what used to be in the package but has now been removed. ([#336](https://github.com/Shopify/h2/pull/336)) by [@frehner](https://github.com/frehner)

  `/__health` still exists for the moment, though at some point it will probably be removed as well.

## 2.0.0-alpha.1

### Patch Changes

- Refactor cart ([#311](https://github.com/Shopify/h2/pull/311)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix a pagination bug on country change ([#317](https://github.com/Shopify/h2/pull/317)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.0-alpha.0

Package renaming. Similar to `@shopify/h2-test-hydrogen@2.0.3`.

# @shopify/h2-test-hydrogen

## 2.0.3

> Deprecated package used during early development

### Patch Changes

- Refactor the API for the server entrypoint by [@jplhomer](https://github.com/jplhomer)

## 2.0.2

### Patch Changes

- Fix changeset workflow ([#282](https://github.com/Shopify/h2/pull/282)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.1

### Patch Changes

- Build project dist files before publishing by [@jplhomer](https://github.com/jplhomer)

## 2.0.0

### Patch Changes

- Fix changeset release to build before publishing to NPM ([#277](https://github.com/Shopify/h2/pull/277)) by [@jplhomer](https://github.com/jplhomer)
