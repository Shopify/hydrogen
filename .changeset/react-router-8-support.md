---
'@shopify/hydrogen': major
'@shopify/cli-hydrogen': major
'@shopify/remix-oxygen': major
'skeleton': major
'@shopify/create-hydrogen': patch
'@shopify/hydrogen-react': patch
---

Support React Router 8 in Hydrogen.

New Hydrogen projects now use React Router 8, React 19.2.7, and Node 22.22.0 or newer. The Hydrogen preset emits React Router 8-compatible configuration, the scaffold no longer installs `react-router-dom`, route `meta` exports use `loaderData` instead of the removed `data` parameter, and package scripts call the local Hydrogen CLI package directly so the scaffolded CLI behavior matches the installed Hydrogen version.

Hydrogen and `@shopify/remix-oxygen` now publish ESM entrypoints only because React Router 8 is ESM-only. If your app still depends on CommonJS `require()` entrypoints for these packages, migrate those imports to ESM before upgrading.
