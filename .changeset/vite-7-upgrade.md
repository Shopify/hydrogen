---
'@shopify/hydrogen': major
'@shopify/mini-oxygen': major
'@shopify/cli-hydrogen': major
'@shopify/hydrogen-react': major
---

**BREAKING CHANGE: Vite 7 Required**

Hydrogen now requires Vite 7.0.0 or higher and Node.js 20.19.0 or higher. Support for Vite 5 and Vite 6 has been removed.

### Migration Guide

**Prerequisites:**
- Node.js 20.19.0+ or 22.12+ (update from 18.0.0+)
- Vite 7.0.0+ (update from 5.x or 6.x)
- Vitest 3.2.4+ if using Vitest (update from 1.x)

**Update your package.json:**
```json
{
  "engines": {
    "node": ">=20.19.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.2.4",
    "@vitest/coverage-v8": "^3.2.4"
  }
}
```

**Then run:**
```bash
npm install
```

### Why Vite 7 Only?

Vite 7 introduced breaking changes to the Module Runner API that are incompatible with previous versions:
- Added `ssrExportNameKey` as a 6th parameter to the SSR context
- Added `getBuiltins()` invoke method
- Removed deprecated `root` option from ModuleRunnerOptions
- Changed parameter ordering in `runInlinedModule`

These changes cannot be polyfilled or made backward compatible without maintaining separate code paths for each Vite version, which would significantly increase maintenance burden.

### What Changed

**For MiniOxygen package:**
- Fixed module runner to use Vite 7's new 6-parameter SSR structure
- Added support for `getBuiltins()` invoke method
- Removed deprecated `root` option from ModuleRunnerOptions
- Updated parameter order in `runInlinedModule` to match Vite 7's esmEvaluator

**For all packages:**
- Updated peer dependencies to require `vite: ^7.0.0`
- Updated minimum Node.js version to 20.19.0
- Updated Vitest to 3.2.4+ (CLI package)

### Browser Support Changes

Vite 7 modernized default browser targets:
- Chrome: 87 → 107
- Edge: 88 → 107
- Firefox: 78 → 104
- Safari: 14.0 → 16.0

This should not affect most Hydrogen storefronts, but if you need to support older browsers, you can configure `build.target` in your Vite config.

### References

- [Vite 7.0 Release Announcement](https://vite.dev/blog/announcing-vite7)
- [Vite 7 Migration Guide](https://vite.dev/guide/migration)
