---
'@shopify/cli-hydrogen': patch
---

Add deploy flags and environment variables for configuring Oxygen's client assets directory and worker directory. The worker directory must contain an `index.js` or `index.mjs` entry point.

Deployments now resolve output directories from explicit flags, Vite output directories, then `dist/client` and `dist/server` fallbacks. Custom output deployments and `0.0.0-preview-*` Hydrogen versions default to `node --run build` instead of the Hydrogen build pipeline when no build command is provided.
