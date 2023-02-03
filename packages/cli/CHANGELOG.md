# @shopify/cli-hydrogen

## 4.0.0-alpha.12

### Patch Changes

- Improve the onboarding experience for the CLI by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.11

### Patch Changes

- Introduce create-app CLI package and refactor how new Hydrogen apps are initialized ([#397](https://github.com/Shopify/h2/pull/397)) by [@frandiox](https://github.com/frandiox)

## 4.0.0-alpha.10

### Patch Changes

- Defer and display the cart count on the hello-world template ([#392](https://github.com/Shopify/h2/pull/392)) by [@juanpprieto](https://github.com/juanpprieto)

## 4.0.0-alpha.9

### Patch Changes

- - Upgrade to the latest Remix experimental defer release, 1.11.0 ([#371](https://github.com/Shopify/h2/pull/371)) by [@blittle](https://github.com/blittle)

  - Replace redundant i18n routes with a single root optional route segment `($lang)`

## 4.0.0-alpha.8

### Patch Changes

- Removed magic routes and `.hydrogen` template routes. See `rfc/obsolete-routing.md` for details of what used to be in the package but has now been removed. ([#336](https://github.com/Shopify/h2/pull/336)) by [@frehner](https://github.com/frehner)

  `/__health` still exists for the moment, though at some point it will probably be removed as well.

## 4.0.0-alpha.7

### Patch Changes

- Change environment variable names to use what Oxygen will populate. ([#354](https://github.com/Shopify/h2/pull/354)) by [@jplhomer](https://github.com/jplhomer)

- Defer CJS imports to improve CLI start up ([#352](https://github.com/Shopify/h2/pull/352)) by [@frandiox](https://github.com/frandiox)

## 4.0.0-alpha.6

### Patch Changes

- Update demo-store template to remove `remix.config.js`, which fixes teh TS-JS conversion process ([#347](https://github.com/Shopify/h2/pull/347)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.5

### Patch Changes

- Properly use JS if specified in the temp init script ([#342](https://github.com/Shopify/h2/pull/342)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.4

### Patch Changes

- Improve output of tmp CLI ([#339](https://github.com/Shopify/h2/pull/339)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.3

### Patch Changes

- Fix remix.init in templates ([#334](https://github.com/Shopify/h2/pull/334)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.2

### Patch Changes

- Fix various issues scaffolding new apps ([#332](https://github.com/Shopify/h2/pull/332)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.1

### Patch Changes

- Update CLI to be executable and bundle templates in dist folder ([#326](https://github.com/Shopify/h2/pull/326)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.0-alpha.0

Package renaming. Similar to `@shopify/cli-h2-test@4.0.5`.

# @shopify/cli-h2-test

> Deprecated package used during early development

## 4.0.5

### Patch Changes

- Allow a `token` to be passed to `init` to support private GitHub repo templates ([#283](https://github.com/Shopify/h2/pull/283)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.4

### Patch Changes

- Change build folder name to dist ([#292](https://github.com/Shopify/h2/pull/292)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 4.0.3

### Patch Changes

- Fix changeset workflow ([#282](https://github.com/Shopify/h2/pull/282)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 4.0.2

### Patch Changes

- Allow a `--template` to be passed to `hydrogen init` ([#280](https://github.com/Shopify/h2/pull/280)) by [@jplhomer](https://github.com/jplhomer)

## 4.0.1

### Patch Changes

- Build project dist files before publishing by [@jplhomer](https://github.com/jplhomer)

## 4.0.0

### Patch Changes

- Fix changeset release to build before publishing to NPM ([#277](https://github.com/Shopify/h2/pull/277)) by [@jplhomer](https://github.com/jplhomer)
