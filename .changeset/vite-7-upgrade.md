---
'@shopify/hydrogen': major
'@shopify/mini-oxygen': major
'@shopify/cli-hydrogen': major
---

Upgrade to Vite 7. Support for Vite 5 and Vite 6 has been removed.

### Migration

Update your project's Vite dependency:

```bash
pnpm add vite@^7.0.0
```

### Browser targets

Vite 7 updated default browser targets. If your storefront needs to support older browsers, configure `build.target` in your Vite config:

| Browser | Vite 6 | Vite 7 |
|---------|--------|--------|
| Chrome  | 87+    | 107+   |
| Firefox | 78+    | 104+   |
| Safari  | 14+    | 16+    |

### References

- [Vite 7 Migration Guide](https://vite.dev/guide/migration)
