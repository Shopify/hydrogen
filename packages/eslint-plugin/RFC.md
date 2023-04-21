# Hydrogen ESLint Plugin Proposal

- [GitHub Discussion](https://github.com/Shopify/hydrogen/discussions/521)

## Overview

This RFC exists to propose a new ESLint setup for Hydrogen, both as a solution to our monorepo used in development and also for users building Hydrogen storefronts.

## Background

In version 1 of hydrogen we had an [`eslint-plugin`](https://github.com/Shopify/hydrogen-v1/tree/v1.x-2022-07/packages/eslint-plugin) package that served to provide the following:

### 1. Common Configurations

These level-set on common ESLint rules to enforce Shopify’s JavaScript best practices, and catch common issues when using Hydrogen. We maintain these so merchants don't need to worry about the undifferentiated setup common to every Hydrogen app. ESLint is a the standard tool for JavaScript and TypeScript, and providing either a base config or plugin is common among almost every other (meta-)framework.

We provide 3 possible configurations:

- The **recommended configuration** enforces Shopify's JavaScript best practices and includes third-party plugins.

```js
{
  extends: 'plugin:hydrogen/recommended',
}
```

The **Hydrogen configuration** excludes suggested third-party plugins, but keeps the custom Hydrogen rules with their suggested defaults.

```js
{
  extends: 'plugin:hydrogen/hydrogen',
}
```

The **TypeScript configuration** is a partial set of overrides to augment the recommended or Hydrogen configurations.

```js
{
  extends: ['plugin:hydrogen/recommended', 'plugin:hydrogen/typescript'],
}
```

### 2. Custom Rules

We also provided a set of custom rules that only made sense in projects using Hydrogen v1.

- [server-component-banned-hooks](https://github.com/Shopify/hydrogen-v1/tree/main/packages/eslint-plugin/src/rules/server-component-banned-hooks): Prevents using the useState, useReducer, useEffect, and useLayoutEffect hooks in files that don't end with the .client extension
- [client-component-banned-hooks](https://github.com/Shopify/hydrogen-v1/tree/main/packages/eslint-plugin/src/rules/client-component-banned-hooks): Prevents using the useQuery hook in files that end with the .client extension
- [prefer-image-component](https://github.com/Shopify/hydrogen-v1/tree/main/packages/eslint-plugin/src/rules/prefer-image-component): Prevents using the img tag directly and suggests using the [Image](https://shopify.dev/api/hydrogen-v1/components/primitive/image) component from @shopify/hydrogen
- [server-no-json-parse](https://github.com/Shopify/hydrogen-v1/tree/main/packages/eslint-plugin/src/rules/server-no-json-parse): Prevents using JSON.parse in a Hydrogen API route or server component
- [prefer-gql](https://github.com/Shopify/hydrogen-v1/tree/main/packages/eslint-plugin/src/rules/prefer-gql): Detects the use of a GraphQL utility other than the one provided by Hydrogen

## Proposal

This proposal recommends the configurations and custom rules will move into the new H2 repo as a new `eslint-plugin` package. The details of this migration are outlined below.

## New configurations

- We will export multiple configurations to enable this package to be used for both storefront developers and contributors. These configurations will be divided into the following domains:
  - `storefront`: This configuration will be exposed for Hydrogen storefronts and used across our `demo-store` and `hello-world` templates and any future scaffolding commands that relate to eslint (for example, `h2 setup eslint`). It will contain a combined config of the internal configs for `react`, `remix` and `hydrogen`.
  - `workspace`: This configuration will be used in the mono-repo root and used across our packages.
  - `cli`: This configuration will be used in the hydrogen packages `cli-hydrogen` and `create-hydrogen` specifically. It will contain a the configurations and custom rules from the `@shopify/eslint-plugin-cli`.
  - `library`: This configuration will be used in the `hydrogen-react` package. It is more strict when it comes to typescript.

## New rules

- We will remove all custom rules except `prefer-image-component`, as it's the one that makes sense in the H2 context.
- `no-missing-error-boundary-in-route`: **Have an `ErrorBoundary` in every route template.** `ErrorBoundary` is used when an Error is thrown in a “loader”, and is generally meant for unexpected errors, like 500, 503, etc. Any Storefront query or mutation error will be handled by the `ErrorBoundary`. Type the error as “unknown” since _anything_ in JS can be thrown 🙂
- `require-error-element-on-await`: **Use the “errorElement” prop on every `<Await>` component.** When using “defer”, some promises may be rejected at a later time. The only way to handle this is to use the “errorElement” on the associated <Await> component, otherwise the error is swallowed.
- `prefer-try-catch-in-route` **Use try/catch** – except in “loader”, “action”, and the Component. Those three “Route Module APIs” are handled automatically by `ErrorBoundary` and CatchBoundary, but the rest – such as “meta”, “links”, “handle”, etc. – will crash the server if an error is thrown.
- `no-try-catch-in-loader` and `no-try-catch-in-action`: For templates it’s easier to let the error be thrown and get handled by the `ErrorBoundary` than to handle it manually.
- `route-module-export-order`: Remix-specific route API functions should be ordered and consistent in style, to help developers quickly scan and find what they're looking for. Order these APIs following a top-down order of concerns:
  1. Http header tweaks (`shouldRevalidate`, `headers`, `meta`, `links`)
  1. Data manipulation (`loader`, `action`)
  1. UI (`Component`)
  1. Error handling (`ErrorBoundary`, `CatchBoundary`)
  1. Storefront API GraphQL query strings

## Detailed design

### Tech stack

The tech stack of the new plugin will be consistent with all hydrogen packages, written in typescript and tested with vitest.

### How to write rules

Rules are structured as follows:

- `/README.md`: contains all documentation and usage instructions.
- `/<name-of-rule>.ts`: contains all code required to evaluate the rule.
- `/<name-of-rule>.test.ts`: contains a suite of tests to validate the rule's valid and invalid states.
- `/index.ts`: re-exports the rule to the outer world.

Rules should auto-fix when possible and contain clear/ consistent messaging that directs users on where they can learn more.

## Incremental adoption

Rather than publish this new package overtop of the old library on NPM, I suggest we release it as `eslint-plugin-h2`. Overtime we can deprecate, remove and overwrite `eslint-plugin-hydrogen` when we are confident with the developer experience.

## Future proof

Rules are easy to write and maintain and we will be constantly evolving this library as Remix and other Hydrogen dependents change.

## Alternate ideas

### Do nothing

We've haven't received negetive feedback about ESLint, nor have we been burdened by the fact the old eslint-plugin is in the old Hydrogen v1 repo and not easily patchable. So why do anything and why do it now?

1. **Reduce risk:** Though we haven't received any problems with the library, it presents a huge risk for future toil. We have an opportunity to be reactive here without much upfront cost.
2. **Capitalize on DX:** ESLint is widely used and built into every IDE in someway. Let's use this to create custom rules that guide merchant developers into the [pit of success](https://blog.codinghorror.com/falling-into-the-pit-of-success/).
3. **External integrations:** Given more predictability in the ESLint setup of Hydrogen storefronts we can more easily interact with the code via CLI, the admin channel and whatever else comes in the future.
4. **Refactor monorepo setup:** Doing nothing also leaves us in a cobbled-together setup for ESLint. This proposal takes the monorepo into account, moving it to a more maintainable configuration.
