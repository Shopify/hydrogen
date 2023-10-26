---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': major
'@shopify/create-hydrogen': major
'@shopify/remix-oxygen': major
---

Update to Remix v2. Remix is now a peer dependency and its version is no longer pinned. This means that you can upgrade to newer Remix 2.x versions without upgrading Hydrogen.

### Breaking changes

Please check the [Remix v2 release notes](https://github.com/remix-run/remix/releases/tag/remix%402.0.0) to see what needs to be changed in your app code. Common changes include:

- Renaming types prefixed with `V2_`. For example, `V2_MetaFunction` is now `MetaFunction`.
- Renaming other types like `LoaderArgs` and `ActionArgs`, which are now `LoaderFunctionArgs` and `ActionFunctionArgs` respectively.

If you were not already using v2 flags, follow the official [Remix migration guide](https://remix.run/docs/en/main/start/v2) before upgrading to v2.
