---
'@shopify/mini-oxygen': patch
---

Make the Oxygen Vite plugin self-sufficient by inferring a compatibility date from the resolved Hydrogen package when one is not provided.

The plugin no longer forces Vite builds into `dist`. Worker-specific resolve conditions now apply only to the SSR worker environment so browser/client modules continue using Vite's normal client conditions. The dev worker entry no longer exposes helper values as runtime exports.
