---
'@shopify/hydrogen': major
'@shopify/mini-oxygen': major
'@shopify/cli-hydrogen': major
'@shopify/hydrogen-react': major
---

Upgrade to Vite 7. Support for Vite 5 and Vite 6 has been removed.

### Migration

Update your project's Vite dependency:

```bash
npm install vite@^7.0.0
```

If you use Vitest, upgrade it as well:

```bash
npm install vitest@^3.2.4 @vitest/coverage-v8@^3.2.4
```

### Why Vite 7 only?

Vite 7 introduced breaking changes to the Module Runner API that are incompatible with previous versions:

- Added `ssrExportNameKey` as a 6th parameter to the SSR evaluation context
- Added `getBuiltins()` invoke method
- Removed deprecated `root` option from `ModuleRunnerOptions`

Supporting both Vite 6 and 7 would require runtime version detection and dual code paths, adding unnecessary complexity.

### Browser targets

Vite 7 modernized default browser targets. If you need to support older browsers, configure `build.target` in your Vite config:

| Browser | Vite 6 | Vite 7 |
|---------|--------|--------|
| Chrome  | 87+    | 107+   |
| Firefox | 78+    | 104+   |
| Safari  | 14+    | 16+    |

### References

- [Vite 7 Migration Guide](https://vite.dev/guide/migration)
