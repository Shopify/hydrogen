<div align="center">

<p align="center">
  <a href="https://hydrogen.shopify.dev"><img src="./.github/images/hydrogen-logo.svg" alt="Hydrogen Logo"/></a>
</p>

[![MIT License](https://img.shields.io/github/license/shopify/hydrogen)](LICENSE.md)
[![npm downloads](https://img.shields.io/npm/dm/@shopify/hydrogen.svg?sanitize=true)](https://npmcharts.com/compare/@shopify/hydrogen?minimal=true)
  

📚 [Docs](https://shopify.dev/custom-storefronts/hydrogen) | 🗣 [Discord](https://discord.gg/Hefq6w5c5d) | 💬 [Discussions](https://github.com/Shopify/hydrogen/discussions) | 📝 [Changelog](./packages/hydrogen/CHANGELOG.md)


  Hydrogen is Shopify’s stack for headless commerce. It provides a set of tools, utilities, and best-in-class examples for building dynamic and performant commerce applications. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework, but it also provides a React library portable to other supporting frameworks.

 </div>

## Hydrogen Legacy v1

Hydrogen legacy v1 has been moved [to a separate repo](https://github.com/Shopify/hydrogen-v1) and the [docs can be found here](https://shopify.github.io/hydrogen-v1/tutorials/getting-started). 

## Getting started with Hydrogen

**Requirements:**

- Node.js version 16.14.0 or higher
- `npm` (or your package manager of choice, such as `yarn` or `pnpm`)

1. Install the latest version of Hydrogen:

   ```bash
   npm create @shopify/hydrogen@latest
   ```

1. Run the local development server:

   ```bash
   npm install
   npm run dev
   ```

1. Open your new Hydrogen app running at http://localhost:3000.

See the complete [Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen).

## Packages in this repo

Hydrogen is organized as a [monorepo](https://monorepo.tools/), which includes multiple packages that can be used together.

| Package                                                  | Latest version                                                                                                                              | Description                                                                                                    | Readme                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [`@shopify/hydrogen`](/packages/hydrogen/)               | [![Latest badge](https://img.shields.io/npm/v/@shopify/hydrogen/latest.svg)](https://www.npmjs.com/package/@shopify/hydrogen)               | Opinionated tools, utilities, and best-in-class examples for building a commerce application with Remix.       | [Readme](/packages/hydrogen#readme)        |
| [`@shopify/hydrogen-react`](/packages/hydrogen-react/)   | [![Latest badge](https://img.shields.io/npm/v/@shopify/hydrogen-react/latest.svg)](https://www.npmjs.com/package/@shopify/hydrogen-react)   | Unopionated and performant library of Shopify-specific commerce components, hooks, and utilities.              | [Readme](/packages/hydrogen-react#readme)  |
| [`@shopify/cli-hydrogen`](/packages/cli/)                | [![Latest badge](https://img.shields.io/npm/v/@shopify/cli-hydrogen/latest.svg)](https://www.npmjs.com/package/@shopify/cli-hydrogen)       | Hydrogen extension for [Shopify CLI](https://shopify.dev/docs/custom-storefronts/hydrogen/cli).                | [Readme](/packages/cli#readme)             |
| [`@shopify/create-hydrogen`](/packages/create-hydrogen/) | [![Latest badge](https://img.shields.io/npm/v/@shopify/create-hydrogen/latest.svg)](https://www.npmjs.com/package/@shopify/create-hydrogen) | Generate a new Hydrogen project from the command line.                                                         | [Readme](/packages/create-hydrogen#readme) |
| [`@shopify/remix-oxygen`](/packages/remix-oxygen/)       | [![Latest badge](https://img.shields.io/npm/v/@shopify/remix-oxygen/latest.svg)](https://www.npmjs.com/package/@shopify/remix-oxygen)       | Remix adapter enabling Hydrogen to run on the [Oxygen](https://shopify.dev/custom-storefronts/oxygen) runtime. | [Readme](/packages/remix-oxygen#readme)    |

## Versioning

Hydrogen and hydrogen-react are tied to specific versions of the [Shopify Storefront API](https://shopify.dev/api/storefront), which follows [calver](https://calver.org/).

For example, if you're using Storefront API version `2023-01`, then Hydrogen and hydrogen-react versions `2022.1.x` are fully compatible.

If the Storefront API version update includes breaking changes, then Hydrogen and hydrogen-react may also include breaking changes. Because the API version is updated every three months, breaking changes could occur every three months.

Learn more about API [release schedules](https://shopify.dev/api/usage/versioning#release-schedule) at Shopify.

## Contributing to Hydrogen

[Read our contributing guide](CONTRIBUTING.md)

## Other handy links

[Learn more about Hydrogen](https://shopify.dev/hydrogen).
