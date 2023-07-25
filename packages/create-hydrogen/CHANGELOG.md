# @shopify/create-hydrogen

## 4.2.0

### What’s new

⭐️ Check out our [blog post](https://hydrogen.shopify.dev/updates) with all the latest updates on Hydrogen, and what’s coming on the roadmap.

Shopify CLI now gives you [more options](https://shopify.dev/docs/custom-storefronts/hydrogen/getting-started/quickstart) when creating a new Hydrogen app on the command line:

- Create a new Shopify storefront and connect it to the local project, or use [Mock.shop](https://mock.shop).
- Pick your styling method: Tailwind, CSS Modules, Vanilla Extract, PostCSS.
- URL strategies to support language and currency options with Shopify Markets.
- Automatically scaffold standard Shopify routes.

### Minor Changes

- The onboarding process when creating new Hydrogen apps has been updated. ([#913](https://github.com/Shopify/hydrogen/pull/913)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Updated dependencies [[`2a036d72`](https://github.com/Shopify/hydrogen/commit/2a036d72c79ef3e40aecfb1832635898208c6d54), [`667ea4fb`](https://github.com/Shopify/hydrogen/commit/667ea4fbf30e632529984c8262010d35e5df38b0), [`ed9782bc`](https://github.com/Shopify/hydrogen/commit/ed9782bc43921d02a2fdbc951c1df1d200812f2d), [`11ab64a8`](https://github.com/Shopify/hydrogen/commit/11ab64a88966dd7b90522f15836abfff6f5d595f), [`00f3e592`](https://github.com/Shopify/hydrogen/commit/00f3e59283d3a413a6acd89722bb71580f73aff5), [`5530d987`](https://github.com/Shopify/hydrogen/commit/5530d98756503878fbf5ac013e2103259ffc0443), [`63d17266`](https://github.com/Shopify/hydrogen/commit/63d172665cf97fae62629f8019d9b2dad29c7d40), [`5530d987`](https://github.com/Shopify/hydrogen/commit/5530d98756503878fbf5ac013e2103259ffc0443)]:
  - @shopify/cli-hydrogen@6.0.0

## 4.1.3

### Patch Changes

- Updated dependencies [[`b2195520`](https://github.com/Shopify/hydrogen/commit/b219552030ed9cdb3fcd3343deaf5c502d12411b), [`42683d0a`](https://github.com/Shopify/hydrogen/commit/42683d0a1b6288d8f6a6e58bfbf2e2650f0d82d2), [`808ceb51`](https://github.com/Shopify/hydrogen/commit/808ceb518a30389d0df4226bed23aead65ccd11f), [`428c78dc`](https://github.com/Shopify/hydrogen/commit/428c78dcb6005c369c0c60e4c4cffb869afa7eb1)]:
  - @shopify/cli-hydrogen@5.0.0

## 4.1.2

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`7aaa4e86`](https://github.com/Shopify/hydrogen/commit/7aaa4e86739e22b2d9a517e2b2cfc20110c87acd)]:
  - @shopify/cli-hydrogen@4.2.1

## 4.1.1

### Patch Changes

- Updated dependencies [[`2039a4a`](https://github.com/Shopify/hydrogen/commit/2039a4a534cf75ebcf39bab6d2f95a535bb5d390)]:
  - @shopify/cli-hydrogen@4.1.1

## 4.1.0

### Minor Changes

- Updated CLI prompts. It's recommended to update your version of `@shopify/cli` to `3.45.0` when updating `@shopify/cli-hydrogen`. ([#733](https://github.com/Shopify/hydrogen/pull/733)) by [@frandiox](https://github.com/frandiox)

  ```diff
  "dependencies": {
  -  "@shopify/cli": "3.x.x",
  +  "@shopify/cli": "3.45.0",
  }
  ```

### Patch Changes

- Updated dependencies [[`e6e6c2d`](https://github.com/Shopify/hydrogen/commit/e6e6c2da274d0582c6b3b9f298dfd2e86dd4bfbe), [`475a39c`](https://github.com/Shopify/hydrogen/commit/475a39c867b0851bba0358b6db9208b664aec68c), [`1f8526c`](https://github.com/Shopify/hydrogen/commit/1f8526c750dc1d5aa7ea02e196fffdd14d17a536), [`0f4d562`](https://github.com/Shopify/hydrogen/commit/0f4d562a2129e8e03ed123dc572a14a72e487a1b), [`2d4c5d9`](https://github.com/Shopify/hydrogen/commit/2d4c5d9340c5a2458c682aa3f9b12352dacdd759), [`68a6028`](https://github.com/Shopify/hydrogen/commit/68a60285a3d563d6e98fb79c3ba6d98eb4ee6be0)]:
  - @shopify/cli-hydrogen@4.1.0

## 4.0.5

### Patch Changes

- Fix register and login issues in the demostore ([#659](https://github.com/Shopify/hydrogen/pull/659)) by [@blittle](https://github.com/blittle)

- Adding decoding prop to the SpreadMedia component ([#642](https://github.com/Shopify/hydrogen/pull/642)) by [@rafaelstz](https://github.com/rafaelstz)

- - Added a route to the Demo store that demonstrates redirecting an order status url back to the online store primary domain. ([#540](https://github.com/Shopify/hydrogen/pull/540)) by [@johncraigcole](https://github.com/johncraigcole)

- Stop hydrating with `requestIdleCallback` ([#667](https://github.com/Shopify/hydrogen/pull/667)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`bceddb4`](https://github.com/Shopify/hydrogen/commit/bceddb44c8f108706428b87201b16ce46b3228c0), [`09259cf`](https://github.com/Shopify/hydrogen/commit/09259cf13af59afecaa86d24ae5ae7696232dd60), [`4443a2b`](https://github.com/Shopify/hydrogen/commit/4443a2b9c85bec3e2a1773d5bc69350dec008df2), [`3344b79`](https://github.com/Shopify/hydrogen/commit/3344b79de67a631293a5a3c3c518d5a7e1924757), [`d8821f8`](https://github.com/Shopify/hydrogen/commit/d8821f85f5313b9326f9c2cbfe33e3e854e48bd2), [`a841303`](https://github.com/Shopify/hydrogen/commit/a84130378424bdebfd33eeef268b61ab7a80f65a)]:
  - @shopify/cli-hydrogen@4.0.9

## 4.0.4

### Patch Changes

- Fix CLI flags for init command, and add `--install-deps`. ([#516](https://github.com/Shopify/hydrogen/pull/516)) by [@frandiox](https://github.com/frandiox)

- Fix pathnames on Windows when running the development server. ([#520](https://github.com/Shopify/hydrogen/pull/520)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`061d1e1`](https://github.com/Shopify/hydrogen/commit/061d1e160710dcc8b483a838ef100517c58d0be2), [`9ada30f`](https://github.com/Shopify/hydrogen/commit/9ada30f40d1297657bea0607ddce25953af91f09), [`d94488b`](https://github.com/Shopify/hydrogen/commit/d94488bcab4695079f61bd6820a3c59ce4604f14), [`ce04cd7`](https://github.com/Shopify/hydrogen/commit/ce04cd7e40fc3df9db5d91d68add2fcefdf0f26c), [`beae9cb`](https://github.com/Shopify/hydrogen/commit/beae9cba9dae652dc558fa9ad62292c12e448be6), [`5634902`](https://github.com/Shopify/hydrogen/commit/5634902691193477db15ac796b42ff1b5044b92a), [`257ce6d`](https://github.com/Shopify/hydrogen/commit/257ce6d9667e3cc8856ab852e30f0454b593e91e)]:
  - @shopify/cli-hydrogen@4.0.6

## 4.0.3

### Patch Changes

- Fix pathnames in Windows when creating projects and generating routes. ([#495](https://github.com/Shopify/hydrogen/pull/495)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`b38506f`](https://github.com/Shopify/hydrogen/commit/b38506faaf19c6ae84d1977017167c40cb9d8fc4)]:
  - @shopify/cli-hydrogen@4.0.4

## 4.0.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`517f0f7`](https://github.com/Shopify/hydrogen/commit/517f0f72531effbe9028e293c77aac1a20828573)]:
  - @shopify/cli-hydrogen@4.0.2

## 4.0.1

### Patch Changes

- Initial release
