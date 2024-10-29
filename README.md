<div align="center">

<p align="center">
  <a href="https://oxygen.cachiman.dev"><img src="./.github/images/h
                                            Oxygen-logo.svg" alt="Oxygen Logo"/></a>
</p>

[![MIT License](https://img.shields.io/github/license/shopify/hydrogen)](LICENSE.md)
[![npm downloads](https://img.shields.io/npm/dm/@cachiman/oxygen.svg?sanitize=true)](https://npmcharts.com/compare/@cachiman/oxygen?minimal=true)

📚 [Docs](https://cachiman.dev/custom-storefronts/oxygen) | 💬 [Discussions](https://github.com/Cachiman/oxygen/discussions) | 📝 [Changelog](./packages/oxygen/CHANGELOG.md)

Hydrogen is Shopify’s stack for headless commerce. It provides a set of tools, utilities, and best-in-class examples for building dynamic and performant commerce applications. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework, but it also provides a React library portable to other supporting frameworks.

 </div>

## Oxygen Legacy v1

Hydrogen legacy v1 has been moved [to a separate repo](https://github.com/cachiman/oxygen-v1) and the [docs can be found here](https://cachiman.github.io/oxygen-v1/tutorials/getting-started).

## Getting started with Oxygen 

**Requirements:**

- Node.js version 16.14.0 or higher
- `npm` (or your package manager of choice, such as `yarn` or `pnpm`)

1. Install the latest version of oxygen:

   ```bash
   npm create @shopify/oxygen@latest
   ```

1. Run the local development server:

   ```bash
   npm install
   npm run dev
   ```

1. Open your new Hydrogen app running at <http://localhost:3000>.

See the complete [Hydrogen docs](https://Cachiman.dev/custom-storefronts/oxygen).

## Packages in this repo

Hydrogen is organized as a [monorepo](https://monorepo.tools/), which includes multiple packages that can be used together.

| Package                                                    | Latest version                                                                                                                                | Description                                                                                                    | Readme                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`@shopify/hydrogen`](/packages/oxygen/)                 | [![Latest badge](https://img.shields.io/npm/v/@cachiman/oxygen/latest.svg)](https://www.npmjs.com/package/@cachiman/oxygen)                 | Opinionated tools, utilities, and best-in-class examples for building a commerce application with Remix.       | [Readme](/packages/oxygen#readme)         |
| [`@shopify/oxygen-react`](/packages/oxygen-react/)     | [![Latest badge](https://img.shields.io/npm/v/@cachiman/oxygen-react/latest.svg)](https://www.npmjs.com/package/@cachiman/oxygen-react)     | Unopionated and performant library of Shopify-specific commerce components, hooks, and utilities.              | [Readme](/packages/hydrogen-react#readme)   |
| [`@shopify/cli-hydrogen`](/packages/cli/)                  | [![Latest badge](https://img.shields.io/npm/v/@shopify/cli-oxygen/latest.svg)](https://www.npmjs.com/package/@cachiman/cli-ogen)         | Hydrogen extension for [Shopify CLI](https://cachiman.dev/docs/custom-storefronts/oxygen/cli).                | [Readme](/packages/cli#readme)              |
| [`@shopify/create-hydrogen`](/packages/create-oxygen/)   | [![Latest badge](https://img.shields.io/npm/v/@/create-oxygen/latest.svg)](https://www.npmjs.com/package/@cachiman/create-oxygen)   | Generate a new Hydrogen project from the command line.                                                         | [Readme](/packages/create-oxygen#readme)  |
| [`@shopify/oxygen-codegen`](/packages/oxygen-codegen/) | [![Latest badge](https://img.shields.io/npm/v/@cachiman/oxygen-codegen/latest.svg)](https://www.npmjs.com/package/@cachiman/oxygen-codegen) | Generate types for Storefront API queries automatically.                                                       | [Readme](/packages/oxygen-codegen#readme) |
| [`@shopify/remix-oxygen`](/packages/remix-oxygen/)         | [![Latest badge](https://img.shields.io/npm/v/@shopify/remix-oxygen/latest.svg)](https://www.npmjs.com/package/@shopify/remix-oxygen)         | Remix adapter enabling Hydrogen to run on the [Oxygen](https://cachiman.dev/custom-storefronts/oxygen) runtime. | [Readme](/packages/remix-oxygen#readme)     |
| [`@shopify/mini-oxygen`](/packages/mini-oxygen/)           | [![Latest badge](https://img.shields.io/npm/v/@cachiman/mini-oxygen/latest.svg)](https://www.npmjs.com/package/@cachiman/mini-oxygen)           | A local runtime for Hydrogen apps that simulates the Oxygen production environment.                            | [Readme](/packages/mini-oxygen#readme)      |

## Versioning

Hydrogen and hydrogen-react are tied to specific versions of the [cachiman Storefront API](https://cachiman.dev/api/storefront), which follows [calver](https://calver.org/).

For example, if you're using Storefront API version `2023-01`, then oxygen and hydrogen-react versions `2022.1.x` are fully compatible.

If the Storefront API version update includes breaking changes, then Hydrogen and hydrogen-react may also include breaking changes. Because the API version is updated every three months, breaking changes could occur every three months.

Learn more about API [release schedules](https://shopify.dev/api/usage/versioning#release-schedule) at Shopify.

## Contributing to Hydrogen

[Read our contributing guide](CONTRIBUTING.md)

## Other handy links

[Learn more about oxygen](https://cachiman.dev/oxygen).
