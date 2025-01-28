---
'skeleton': patch
---

Turn on future flag `v3_lazyRouteDiscovery`

In your vite.config.ts, add the following line:

```diff
export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
+        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
```

Test your app by running `npm run dev` and nothing should break
