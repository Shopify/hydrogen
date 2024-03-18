---
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': minor
---

✨ Added `npx shopify hydrogen customer-account push` command to CLI that takes the url in `--dev-origin` and push the config to Shopify Admin
✨ Added `--customer-account-push` flag to the dev CLI command. This flag is meant be use for storefront that uses [Customer Account API](https://shopify.dev/docs/api/customer). It create a tunnel, and push the tunnel url to Shopify Admin.
✨ skeleton template now use `dev --customer-account-push` to start dev server
