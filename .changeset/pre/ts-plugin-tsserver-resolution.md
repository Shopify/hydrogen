---
"@shopify/hydrogen": patch
---

Fix `@shopify/hydrogen/ts-plugin` not loading in editors. tsserver resolves `compilerOptions.plugins` with TypeScript's legacy JS resolver, which ignores package `exports`, so the plugin was silently skipped and GraphQL hover docs and completions inside `gql()` documents were missing. The package now ships a `ts-plugin/package.json` that the legacy resolver can find. Type errors for invalid fields were unaffected since those come from `gql()` types, not the plugin.
