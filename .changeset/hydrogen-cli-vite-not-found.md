---
'@shopify/cli-hydrogen': patch
---

Show a clear, actionable error when `vite` cannot be found in your project instead of crashing with an unhandled `Cannot find module 'vite'`. This typically happens when a Hydrogen command is run outside the app directory or before installing dependencies; the CLI now explains how to fix it.
