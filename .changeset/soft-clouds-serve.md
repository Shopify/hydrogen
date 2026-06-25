---
'@shopify/mini-oxygen': patch
---

Make the Oxygen Vite plugin self-sufficient by inferring a compatibility date from the resolved Hydrogen package when one is not provided.

The plugin no longer forces Vite builds into `dist`, preserves configured worker entry IDs for framework adapters, and prepends a clearer Mini Oxygen message when Vite cannot load the configured worker entry.
