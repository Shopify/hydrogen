# Gated Hydrogen Example

This is an example repository which can be used to follow along in the [build a tokengated storefront tutorial series](https://shopify.dev/docs/apps/blockchain/tokengating/build-a-tokengated-storefront).


## Getting started

Remember to update `.env` with your shop's domain and Storefront API token!

1. Replace instances of `headless_gating_example` with your gate configuration's metafield namespace.
2. Replace instances of `_headless_gate_context` with your desired cart attributes key name (this is referenced in your Shopify Function).

## Sample .env

```
ALCHEMY_API_KEY="YOUR_ALCHEMY_API_KEY"
SESSION_SECRET="YOUR_SESSION_SECRET"
SHOPIFY_FUNCTION_SECRET="YOUR_FUNCTION_SECRET"
PUBLIC_STOREFRONT_API_TOKEN="YOUR_API_TOKEN"
PUBLIC_STOREFRONT_API_VERSION="unstable"
PUBLIC_STORE_DOMAIN="YOUR_STOREFRONT_DOMAIN"
```

## Local development

```bash
npm run dev
```

## License

MIT &copy; [Shopify](https://shopify.com/), see [LICENSE.md](LICENSE.md) for details.

<a href="https://shopify.com" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./images/shopify-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="./images/shopify-dark.svg">
    <img alt="Shopify Logo" src="./images/shopify-dark.svg">
  </picture>
</a>
