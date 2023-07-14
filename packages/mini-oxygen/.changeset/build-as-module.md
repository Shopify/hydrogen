---
'@shopify/mini-oxygen': major
---

- Mini Oxygen can no longer be used in a standalone fashion
- It is now built as ESM module
- Support for the JSON based configuration file is dropped and as such the `oxygen-gen-config` command no longer exists
- The `preview` function has been renamed to `startServer`
- `startServer` is now a named export
