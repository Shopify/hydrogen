# Hydrogen-UI

The monorepo for the Hydrogen-UI library; each package can be found in the `./packages` folder.

## Versioning

**Hydrogen UI doesn't follow semantic versioning**.

Hydrogen UI is tied to specific versions of the [Shopify Storefront API](https://shopify.dev/api/storefront), which follow [calver](https://calver.org/).

For example, if you're using Storefront API version `2022-07`, then Hydrogen UI versions `2022.7.x` are fully compatible.

If the Storefront API version update includes breaking changes, then Hydrogen UI includes breaking changes. Because the API version is updated every three months, breaking changes could occur every three months.

Learn more about API [release schedules](https://shopify.dev/api/usage/versioning#release-schedule) at Shopify.
