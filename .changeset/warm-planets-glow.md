---
'@shopify/mini-oxygen': minor
'@shopify/hydrogen': minor
'@shopify/cli-hydrogen': minor
'@shopify/hydrogen-react': minor
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Add support for Vite 7 and Vite 8. Hydrogen remains backwards-compatible with Vite 5+.

Mini Oxygen's dev server has been refactored to use the [Vite Environment API](https://vite.dev/guide/api-environment), which is the standard way to run non-browser runtimes in Vite. This replaces the previous custom middleware approach with a first-class `FetchableDevEnvironment`, improving compatibility with Vite's built-in HMR and module invalidation.

New Hydrogen projects created with `npm create @shopify/hydrogen` will default to Vite 8. The `vite-tsconfig-paths` plugin is no longer needed in the skeleton template since Vite 8 supports `resolve.tsconfigPaths` natively.
