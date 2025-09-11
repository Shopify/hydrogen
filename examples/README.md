# Hydrogen examples

The example apps in this directory show how to implement popular design patterns in Hydrogen.

Each example is a complete, standalone Hydrogen application that demonstrates specific features and patterns. See each example's README file for details on the problem it solves, how the solution works, and any other requirements you'll need.

## Full-featured example

See the full-featured example https://hydrogen.shop at https://github.com/Shopify/hydrogen-demo-store

## Popular examples

These are some of the most commonly used Hydrogen examples. Browse the folders in this directory for the complete list.

| Example                                                                   | Details                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Analytics](/examples/analytics/)                                         | End-to-end example of how to implement analytics for Hydrogen.                                                                                                                                                                                                              |
| [B2B](/examples/b2b/)                                                     | Headless B2B store front                                                                                                                                                                                                                                                    |
| [Custom Cart Method](/examples/custom-cart-method/)                       | How to implementation custom cart method by showing in-line product option edit in cart.                                                                                                                                                                                    |
| [Express](/examples/express/)                                             | Using NodeJS [Express](https://expressjs.com/).                                                                                                                                                                                                                             |
| [Infinite Scroll](/examples/infinite-scroll/)                             | [Infinite scroll](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#automatically-load-pages-on-scroll) within a product collection page using the [Pagination component](https://shopify.dev/docs/api/hydrogen/2024-01/components/pagination). |
| [Legacy Customer Account Flow](/examples/legacy-customer-account-flow/)   | The legacy customer account flow made with [Storefront API](https://shopify.dev/docs/api/storefront).                                                                                                                                                                       |
| [Metaobjects](/examples/metaobjects/)                                     | How to use [metaobjects](https://help.shopify.com/en/manual/custom-data/metaobjects) as a Content Management System (CMS) for Hydrogen.                                                                                                                                     |
| [Multipass](/examples/multipass/)                                         | Connect your existing third-party authentication method to Shopify’s customer accounts, so buyers can use a single login across multiple services.                                                                                                                          |
| [Partytown](/examples/partytown/)                                         | Lazy-loading [Google Tag Manager](https://support.google.com/tagmanager) using [Partytown](https://partytown.builder.io/).feature.                                                                                                                                          |
| [Third-party Queries and Caching](/examples/third-party-queries-caching/) | How to leverage Oxygen's sub-request caching when querying third-party GraphQL API in Hydrogen.                                                                                                                                                                             |

## Install an example

Setup a new project example by using the `--template` CLI param:

```bash
npm create @shopify/hydrogen@latest -- --template custom-cart-method
```

## Request an example

If you don’t see the example you’re looking for, you can [request one through the Discussions tab](https://github.com/Shopify/hydrogen/discussions/new?category=ideas-feature-requests&title=Hydrogen%20example%20request%3A%20%5BYour%20request%20here%5D%0A%0A).

## Contributing examples

Hydrogen is an open-source project, and we welcome your input! See the Hydrogen [contribution docs](/docs/examples/README.md) for more details on how to add your own examples to this repo.

### Creating new examples

When creating a new example:

1. Copy an existing example as a starting point
2. Update the `package.json` with a unique name using the `example-` prefix
3. Modify the code to demonstrate your specific feature or pattern
4. Add the example package to the `workspaces` option in the main repo package.json
5. Add the new example to this README
6. Include a comprehensive README.md explaining:
   - What problem the example solves
   - Key files and modifications
   - Any special requirements or setup needed
