---
'@shopify/mini-oxygen': minor
---

- Make the Oxygen Vite plugin self-sufficient by inferring a compatibility date from the resolved Hydrogen package when one is not provided.
- Worker-specific resolve conditions now apply only to the SSR worker environment so browser/client modules continue using Vite's normal client conditions.
- `oxygen.json` is now emitted only during SSR builds.
- The Oxygen Vite plugin now loads Vite environment variables as Mini Oxygen bindings when no env bindings are provided by plugin options or the Hydrogen CLI.
- `vite preview` can now run the built Oxygen worker in Mini Oxygen, with an optional `previewEntry` override for custom worker output paths.
