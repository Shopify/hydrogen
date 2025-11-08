---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'skeleton': patch
---

Fix Tailwind CSS v4 FOUC issues and update to latest stable version

- Update Tailwind CSS from v4.1.6 to v4.1.12 (latest stable)
- Enable Tailwind CSS by default for quickstart projects
- Add `fetchPriority: 'high'` to CSS preload hints to prevent FOUC
- Enable React Router's `unstable_viteEnvironmentApi` flag for critical CSS handling
- Set `cssCodeSplit: false` in Hydrogen Vite plugin to prevent route-level FOUC
- Fix `replaceRootLinks` to properly replace `appStyles` with `tailwindStyles` instead of adding both
- Add comprehensive E2E and unit tests for Tailwind scaffolding