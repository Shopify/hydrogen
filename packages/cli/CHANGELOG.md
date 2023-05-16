# @shopify/cli-hydrogen

## 4.1.2

### Patch Changes

- Add command to pull environment variables from a Hydrogen storefront defined in the Shopify Admin ([#809](https://github.com/Shopify/hydrogen/pull/809)) by [@graygilmore](https://github.com/graygilmore)

- Update docs links on successful project creation ([#810](https://github.com/Shopify/hydrogen/pull/810)) by [@gfscott](https://github.com/gfscott)

- New `--debug` flag for the `dev` command that attaches a Node inspector to the development server. ([#869](https://github.com/Shopify/hydrogen/pull/869)) by [@frandiox](https://github.com/frandiox)

- Ensure request logs are shown in MiniOxygen during development. ([#836](https://github.com/Shopify/hydrogen/pull/836)) by [@frandiox](https://github.com/frandiox)

  Provide [custom Oxygen headers](https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers) in local MiniOxygen.

- Add new commands for merchants to be able to list and link Hydrogen storefronts on Shopify ([#784](https://github.com/Shopify/hydrogen/pull/784)) by [@graygilmore](https://github.com/graygilmore)

- Updated dependencies [[`025385b6`](https://github.com/Shopify/hydrogen/commit/025385b6f9f58a76ffb15d9f505dfbf2b5e21427), [`0a009a3b`](https://github.com/Shopify/hydrogen/commit/0a009a3ba06dadd8f9d799575d7f88590f82a966)]:
  - @shopify/remix-oxygen@1.0.6
  - @shopify/hydrogen-react@2023.4.1

## 4.1.1

### Patch Changes

- Fix the `check routes` command to match optional segments. ([#774](https://github.com/Shopify/hydrogen/pull/774)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`82b6af7`](https://github.com/Shopify/hydrogen/commit/82b6af71cafe1f88c24630178e61cd09e5a59f5e), [`361879e`](https://github.com/Shopify/hydrogen/commit/361879ee11dfe8f1ee916b022165b1e7f0e45964)]:
  - @shopify/hydrogen-react@2023.4.0

## 4.1.0

### Minor Changes

- Updated CLI prompts. It's recommended to update your version of `@shopify/cli` to `3.45.0` when updating `@shopify/cli-hydrogen`. ([#733](https://github.com/Shopify/hydrogen/pull/733)) by [@frandiox](https://github.com/frandiox)

  ```diff
  "dependencies": {
  -  "@shopify/cli": "3.x.x",
  +  "@shopify/cli": "3.45.0",
  }
  ```

- Added a new `shortcut` command that creates a global `h2` alias for the Hydrogen CLI: ([#679](https://github.com/Shopify/hydrogen/pull/679)) by [@frandiox](https://github.com/frandiox)

  ```sh
  $> npx shopify hydrogen shortcut
  ```

  After that, you can run commands using the new alias:

  ```sh
  $> h2 generate route home
  $> h2 g r home # Same as the above
  $> h2 check routes
  ```

### Patch Changes

- Add support for the Remix future flags `v2_meta`, `v2_errorBoundary` and `v2_routeConvention` to the `generate` command. If these flags are enabled in your project, the new generated files will follow the v2 conventions. ([#756](https://github.com/Shopify/hydrogen/pull/756)) by [@frandiox](https://github.com/frandiox)

- Update virtual route to use Remix V2 route name conventions ([#792](https://github.com/Shopify/hydrogen/pull/792)) by [@DavidWittness](https://github.com/DavidWittness)

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

- Improve type safety in SEO data generators. ([#763](https://github.com/Shopify/hydrogen/pull/763)) by [@davidhousedev](https://github.com/davidhousedev)

- Updated dependencies [[`85ae63a`](https://github.com/Shopify/hydrogen/commit/85ae63ac37e5c4200919d8ae6c861c60effb4ded), [`5e26503`](https://github.com/Shopify/hydrogen/commit/5e2650374441fb5ae4840215fefdd5d547a378c0), [`1f8526c`](https://github.com/Shopify/hydrogen/commit/1f8526c750dc1d5aa7ea02e196fffdd14d17a536)]:
  - @shopify/hydrogen-react@2023.1.8
  - @shopify/remix-oxygen@1.0.5

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
