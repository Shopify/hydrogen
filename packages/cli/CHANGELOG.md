# @shopify/cli-hydrogen

## 4.0.9

### Patch Changes

- 1. Update Remix to 1.14.0 ([#599](https://github.com/Shopify/hydrogen/pull/599)) by [@blittle](https://github.com/blittle)

  1. Add `Cache-Control` defaults to all the demo store routes

- Fixed a typo in the install deps flag. The flag is now SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS. ([#672](https://github.com/Shopify/hydrogen/pull/672)) by [@cartogram](https://github.com/cartogram)

- Display warning for deprecated flags. ([#609](https://github.com/Shopify/hydrogen/pull/609)) by [@cartogram](https://github.com/cartogram)

- Fix bug in CLI not recognising the --install-deps flag when creating projects ([#644](https://github.com/Shopify/hydrogen/pull/644)) by [@cartogram](https://github.com/cartogram)

- Fix `check routes` command to correctly check the standard route `/discount/<code>` instead of `/discounts/<code>`. ([#601](https://github.com/Shopify/hydrogen/pull/601)) by [@frandiox](https://github.com/frandiox)

- Stop hydrating with `requestIdleCallback` ([#667](https://github.com/Shopify/hydrogen/pull/667)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`c78f441`](https://github.com/Shopify/hydrogen/commit/c78f4410cccaf99d93b2a4e4fbd877fcaa2c1bce), [`7fca5d5`](https://github.com/Shopify/hydrogen/commit/7fca5d569be1d6749fdfa5ada6723d8186f0d775)]:
  - @shopify/hydrogen-react@2023.1.7
  - @shopify/remix-oxygen@1.0.4

## 4.0.8

### Patch Changes

- Improve rate limit error messages when creating new projects. ([#553](https://github.com/Shopify/hydrogen/pull/553)) by [@frandiox](https://github.com/frandiox)

- Show better errors when initial build fails, and recover when fixing it. ([#514](https://github.com/Shopify/hydrogen/pull/514)) by [@frandiox](https://github.com/frandiox)

## 4.0.7

### Patch Changes

- Use woff2 format instead of ttf in onboarding routes to reduce download size of font files. ([#538](https://github.com/Shopify/hydrogen/pull/538)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Show available upgrades for CLI when creating new projects. ([#518](https://github.com/Shopify/hydrogen/pull/518)) by [@frandiox](https://github.com/frandiox)

## 4.0.6

### Patch Changes

- Fix CLI flags for init command, and add `--install-deps`. ([#516](https://github.com/Shopify/hydrogen/pull/516)) by [@frandiox](https://github.com/frandiox)

- Fix template download on Windows during project creation. ([#528](https://github.com/Shopify/hydrogen/pull/528)) by [@tchalabi](https://github.com/tchalabi)

- Fix template imports to only reference `@shopify/hydrogen`, not `@shopify/hydrogen-react` ([#523](https://github.com/Shopify/hydrogen/pull/523)) by [@blittle](https://github.com/blittle)

- Fix pathnames on Windows when running the development server. ([#520](https://github.com/Shopify/hydrogen/pull/520)) by [@frandiox](https://github.com/frandiox)

- Onboarding fonts and styles ([#533](https://github.com/Shopify/hydrogen/pull/533)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Corrects links referred to in Onboarding Route. ([#509](https://github.com/Shopify/hydrogen/pull/509)) by [@benjaminsehl](https://github.com/benjaminsehl)

- Improve onboarding style and links ([#525](https://github.com/Shopify/hydrogen/pull/525)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Updated dependencies [[`ff9d729`](https://github.com/Shopify/hydrogen/commit/ff9d7297bf6cb814ac4593cb20402872ef7c30eb)]:
  - @shopify/remix-oxygen@1.0.3

## 4.0.5

### Patch Changes

- Fix missing assets in virtual routes. ([#503](https://github.com/Shopify/hydrogen/pull/503)) by [@frandiox](https://github.com/frandiox)

## 4.0.4

### Patch Changes

- Fix pathnames in Windows when creating projects and generating routes. ([#495](https://github.com/Shopify/hydrogen/pull/495)) by [@frandiox](https://github.com/frandiox)

## 4.0.3

### Patch Changes

- Fix initialization a new Hydrogen project on Windows ([#478](https://github.com/Shopify/hydrogen/pull/478)) by [@pepicrft](https://github.com/pepicrft)

## 4.0.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`517f0f7`](https://github.com/Shopify/hydrogen/commit/517f0f72531effbe9028e293c77aac1a20828573)]:
  - @shopify/remix-oxygen@1.0.2

## 4.0.1

### Patch Changes

- Initial release
