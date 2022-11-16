<div align="center">

# Hydrogen UI React

<a href="https://www.npmjs.com/package/@shopify/hydrogen-react"><img src="https://img.shields.io/npm/v/@shopify/hydrogen-react/latest.svg"></a> <a href="https://www.npmjs.com/package/@shopify/hydrogen-react"><img src="https://img.shields.io/npm/v/@shopify/hydrogen-react/next.svg"></a>

</div>

**IMPORTANT:** This is an experimental version of `@shopify/hydrogen-react` and functionality is subject to change. Refer to how this package is [versioned](../../README.md#versioning).

This document contains the following topics:

- [Getting started with Hydrogen UI](#getting-started)
- [Authenticating the Storefront API client](#authenticating-the-storefront-client)
- [Development and production bundles](#development-and-production-bundles)
- [Hydrogen UI in the browser](#hydrogen-ui-in-the-browser)
- [Enabling autocompletion for the Storefront API](#enable-storefront-api-graphql-autocompletion)
- [Setting TypeScript types for Storefront API objects](#set-typescript-types)
- [Troubleshooting](#troubleshooting)

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

## Authenticating the Storefront client

To make it easier to query the Storefront API, Hydrogen UI exposes a helper function called `createStorefrontClient()`.

The client can take in the following tokens:

- **[Delegate access](https://shopify.dev/api/usage/authentication#getting-started-with-authenticated-access)**: Used for requests from a server or other private context. Set as `privateStorefrontToken`.

- **[Public](https://shopify.dev/api/usage/authentication#getting-started-with-public-access)**: Used for requests from a browser or other public context. Set as `publicAccessToken`.

The following is an example:

```ts
// Filename: '/shopify-client.js'

import {createStorefrontClient} from '@shopify/hydrogen-react';

const client = createStorefrontClient({
  privateStorefrontToken: '...',
  storeDomain: 'myshop',
  storefrontApiVersion: '2022-10',
});

export const getStorefrontApiUrl = client.getStorefrontApiUrl;
export const getPrivateTokenHeaders = client.getPrivateTokenHeaders;
```

You can then use this in your server-side queries. Here's an example of using it for [NextJS's `getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props):

```ts
// Filename: '/pages/index.js'

import {
  getStorefrontApiUrl,
  getPrivateTokenHeaders,
} from '../shopify-client.js';

export async function getServerSideProps() {
  const response = await fetch(getStorefrontApiUrl(), {
    body: GRAPHQL_QUERY,
    headers: getPrivateTokenHeaders({buyerIp: '...'}),
    method: 'POST',
  });

  const json = await response.json();

  return {props: json};
}
```

### (Optional) Set the content type for the Storefront client

By default, the Storefront client sends the `"content-type": "application/json"` header. Use the `json` content type when you have GraphQL variables and when the body is an object with the following shape:

```json
{
  "query": "...",
  "operationName": "...",
  "variables": { "myVariable": "someValue", ... }
}
```

However, when the body is only a query string, such as `{"..."}`, you can optionally change the default header to `application/graphql`:

```ts
createStorefrontClient({contentType: 'graphql', ...})
```

Alternatively, each time you get the headers you can customize which `"content-type"` you want, for only that one invocation:

```ts
getPrivateTokenHeaders({contentType: 'graphql'});
```

**Note:** If you're using TypeScript, then you can [improve the typing experience](#set-typescript-types).

## Development and production bundles

Hydrogen UI has a development bundle and a production bundle. The development bundle has warnings and messages that the production bundle doesn't.

Depending on the bundler or runtime that you're using, the correct bundle might be automatically chosen following the `package.json#exports` of Hydrogen UI. If not, then you might need to configure your bundler / runtime to use the `development` and `production` conditions.

**Note:** The production bundle is used by default if your bundler / runtime doesn't understand the export conditions.

## Hydrogen UI in the browser

Hydrogen UI has a development `umd` build and a production `umd` build. Both are meant to be used directly either by `<script src=""></script>` tags in HTML or by `AMD`-compatible loaders.

If you're using Hydrogen UI as a global through the `<script>` tag, then the components can be accessed through the `hydrogenreact` global variable.

## Enable Storefront API GraphQL autocompletion

To improve your development experience, enable GraphQL autocompletion for the Storefront API in your integrated development environment (IDE).

1. Add [`graphql`](https://www.npmjs.com/package/graphql) and [GraphQL-config](https://www.graphql-config.com/docs/user/user-installation) with the following command:

   ```bash
   yarn add --dev graphql graphql-config
   ```

1. Create a [GraphQL config file](https://www.graphql-config.com/docs/user/user-usage) at the root of your code. For example, `.graphqlrc.yml`.
1. Add a [`schema`](https://www.graphql-config.com/docs/user/user-schema) and point it to Hydrogen UI's bundled schema for the Storefront API.

   For example:

   ```yml
   # Filename: .graphqlrc.yml
   schema: node_modules/@shopify/hydrogen-react/storefront.schema.json
   ```

1. Install a GraphQL extension in your IDE, such as the [GraphQL extension for VSCode](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql).

GraphQL autocompletion and validation will now work in `.graphql` files and in [`gql`](https://github.com/apollographql/graphql-tag) template literals!

If you're having trouble getting it to work, then consult our [troubleshooting section](#graphql-autocompletion).

## Set TypeScript types

Improve your development experience by adding strong typing to Storefront API responses. The following are some options for doing this.

## GraphQL CodeGen

To use GraphQL CodeGen, follow [their guide](https://the-guild.dev/graphql/codegen/docs/getting-started/installation) to get started. Then, when you have a `codegen.ts` file, you can modify the following lines in the codegen object to improve the CodgeGen experience:

```ts
import {storefrontApiCustomScalars} from '@shopify/hydrogen-react';

const config: CodegenConfig = {
  // Use the schema that's bundled with @shopify/hydrogen-react
  schema: './node_modules/@shopify/hydrogen-react/storefront.schema.json',
  generates: {
    './gql/': {
      preset: 'client',
      plugins: [],
      config: {
        // Use the custom scalar definitions that @shopify/hydrogen-react provides to improve the types
        scalars: storefrontApiCustomScalars,
      },
    },
  },
};
```

### Use the `StorefrontApiResponseError` and `StorefrontApiResponseOk` helpers

The following is an example:

```tsx
import {
  type StorefrontApiResponseError,
  type StorefrontApiResponseOk,
} from '@shopify/hydrogen-react';

async function FetchApi<DataGeneric>() {
  const apiResponse = await fetch('...');

  if (!apiResponse.ok) {
    // 400 or 500 level error
    return (await apiResponse.text()) as StorefrontApiResponseError; // or apiResponse.json()
  }

  const graphqlResponse: StorefrontApiResponseOk<DataGeneric> =
    await apiResponse.json();

  // You can now access 'graphqlResponse.data' and 'graphqlResponse.errors'
}
```

### Use the `StorefrontApiResponse` helper

If you're using a library that handles 400/500 level errors for you, then you can use `StorefrontApiResponse`. To add typing to objects that are trying to match a Storefront API object shape, you can import the shape.

The following is an example:

```ts
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

const product: Product = {};
```

### Use TypeScript's helpers

To create your own object shapes, you can use TypeScript's built-in helpers.

The following is an example:

```ts
const partialProduct: Partial<Product> = {};

const productTitle: Pick<Product, 'title'> = '';

const productExceptTitle: Omit<Product, 'title'> = {};
```

## Troubleshooting

The following will help you troubleshoot common problems in this version of Hydrogen UI.

### GraphQL autocompletion

If you can't get [GraphQL autocompletion](<(#storefront-api-graphql-autocompletion)>) to work, then try restarting the GraphQL server in your IDE.

For example, in VSCode do the following:

1. Open the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).
1. Type `graphql`.
1. Select `VSCode GraphQL: Manual Restart`.
