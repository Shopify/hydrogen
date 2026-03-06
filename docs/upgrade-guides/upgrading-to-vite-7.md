# Upgrading to Vite 7

Hydrogen now requires Vite 7.0.0 or higher. This guide covers the changes needed to upgrade your Hydrogen storefront.

## Prerequisites

- Node.js 22+ (see `engines` field in package.json)
- npm 11.6.2+

## Step 1: Update dependencies

```bash
npm install vite@^7.0.0
```

If you use Vitest for testing:

```bash
npm install vitest@^3.2.4 @vitest/coverage-v8@^3.2.4
```

## Step 2: Verify your Vite config

No changes are required to `vite.config.ts` for most projects. The Hydrogen and MiniOxygen Vite plugins are fully compatible with Vite 7.

If you have custom SSR configuration, note that the `root` option has been removed from `ModuleRunnerOptions`.

## Step 3: Check browser targets

Vite 7 updated its default browser targets:

- Chrome 107+ (was 87+)
- Firefox 104+ (was 78+)
- Safari 16+ (was 14+)

If your storefront needs to support older browsers, add explicit targets to your Vite config:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: ['chrome87', 'firefox78', 'safari14'],
  },
});
```

## Step 4: Run your project

```bash
npm run dev
```

The development server should start without the `ReferenceError: __vite_ssr_exportName__ is not defined` error that occurred with Vite 7 on older versions of `@shopify/mini-oxygen`.

## Troubleshooting

### `__vite_ssr_exportName__ is not defined`

This error means you're running Vite 7 with an older version of `@shopify/mini-oxygen`. Update all Hydrogen packages:

```bash
npm install @shopify/hydrogen@latest @shopify/mini-oxygen@latest @shopify/cli-hydrogen@latest
```

### Vitest compatibility

Vite 7 requires Vitest 3.2.4+. If you see test runner errors, upgrade Vitest:

```bash
npm install vitest@^3.2.4
```
