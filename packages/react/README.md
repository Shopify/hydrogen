<div align="center">

# Hydrogen React

Hydrogen React is an unopionated and performant library of Shopify-specific commerce components, hooks, and utilities. Bring the best parts of Hydrogen to more React frameworks, like Next.js and Gatsby, and accelerate headless development using Shopify’s pre-built React components including Cart, Shop Pay, and Shopify Analytics.

📚 [Overview](https://shopify.dev/custom-storefronts/hydrogen-react) | 🛠️ [Docs](https://shopify.dev/docs/api/hydrogen-react) | 🛍️ [Custom Storefronts at Shopify](https://shopify.dev/custom-storefronts) | 🗣 [Discord](https://discord.gg/Hefq6w5c5d) | 📝 [Changelog](https://github.com/Shopify/hydrogen-react/blob/main/packages/react/CHANGELOG.md)

**IMPORTANT:** Refer to how this package is [versioned](../../README.md#versioning).

<a href="https://www.npmjs.com/package/@shopify/hydrogen-react"><img src="https://img.shields.io/npm/v/@shopify/hydrogen-react/latest.svg"></a> <a href="https://www.npmjs.com/package/@shopify/hydrogen-react"><img src="https://img.shields.io/npm/v/@shopify/hydrogen-react/next.svg"></a>

</div>

This document contains the following topics:

- [Getting started with Hydrogen React](#getting-started)
- [Improving the Developer Experience](#improving-the-developer-experience)
- [Development and production bundles](#development-and-production-bundles)
- [Hydrogen React in the browser](#hydrogen-react-in-the-browser)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Getting started

- Run one of the following commands:

  npm:

  ```bash
  npm i --save @shopify/hydrogen-react
  ```

  Yarn:

  ```bash
  yarn add @shopify/hydrogen-react
  ```

Browse our [overview](https://shopify.dev/custom-storefronts/hydrogen-react) and [docs](https://shopify.dev/docs/api/hydrogen-react) to learn more.

## Improving the Developer Experience

`hydrogen-react` includes several tools that improve the developer experience, such as:

- Creating a [storefront client](https://shopify.dev/docs/api/hydrogen-react/utilities/createstorefrontclient) to easily make API requests to the Storefront API
- Enabling [GraphQL validation and autocompletion](https://shopify.dev/docs/api/hydrogen-react/utilities/storefront-schema) for the Storefront API
- Using the pre-built [TypeScript types for the Storefront API](https://shopify.dev/docs/api/hydrogen-react/utilities/storefront-api-types)
- Correctly typing the Storefront API's custom scalars [when using GraphQL Codegen](https://shopify.dev/docs/api/hydrogen-react/utilities/storefrontapicustomscalars) and TypeScript

## Development and production bundles

Hydrogen React has a development bundle and a production bundle. The development bundle has warnings and messages that the production bundle doesn't.

Depending on the bundler or runtime that you're using, the correct bundle might be automatically chosen following the `package.json#exports` of Hydrogen React. If not, then you might need to configure your bundler / runtime to use the `development` and `production` conditions.

**Note:** The production bundle is used by default if your bundler / runtime doesn't understand the export conditions.

## Hydrogen React in the browser

Hydrogen React has a development `umd` build and a production `umd` build. Both are meant to be used directly either by `<script src=""></script>` tags in HTML or by `AMD`-compatible loaders.

If you're using Hydrogen React as a global through the `<script>` tag, then the components can be accessed through the `hydrogenreact` global variable.

## Troubleshooting

The following will help you troubleshoot common problems in this version of Hydrogen React.

### GraphQL autocompletion

If you can't get [GraphQL autocompletion](<(#storefront-api-graphql-autocompletion)>) to work, then try restarting the GraphQL server in your IDE.

For example, in VSCode do the following:

1. Open the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).
1. Type `graphql`.
1. Select `VSCode GraphQL: Manual Restart`.

## Contributing

We love contributions! Contributing works best when you first confirm that something needs to be changed or fixed; please open an issue, start a discussion, or talk to us in Discord!

PRs are welcome! Be sure to read the [CONTRIBUTING.md](../../CONTRIBUTING.md) for an overview and guidelines to help your PR succeed.
