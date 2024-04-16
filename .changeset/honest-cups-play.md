---
'skeleton': patch
---

Stop inlining the favicon in base64 to avoid issues with the Content-Security-Policy. In `vite.config.js`:

```diff
export default defineConfig({
  plugins: [
    ...
  ],
+ build: {
+   assetsInlineLimit: 0,
+ },
});
```
