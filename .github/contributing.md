# Contributing to Hydrogen

> Tip:
> Looking for [releasing instructions](releasing.md)?

**Requirements:**

- Node.js version 16.14.0 or higher
- Yarn

```bash
git clone git@github.com:Shopify/hydrogen.git
npm install
npm run build
```

To develop against a template, open a new terminal window or tab and choose from the available templates:

- templates/demo-store
- templates/hello-world-ts

```bash
cd templates/demo-store
npm run dev
```

Visit the dev environment at http://localhost:3000.

To make changes to the Demo Store template, edit the files in `templates/demo-store`.

To modify Hydrogen framework, components, and hooks, edit the files in `packages/hydrogen`.

## Context

Hydrogen is a monorepo built with [Turbo](https://turbo.build/). It consists of several key packages:

- `templates`: Full working implementations of a Hydrogen storefront (including the Demo Store template)
- `packages/hydrogen`: The hooks, components, and utilities provided by Hydrogen
- `packages/remix-oxygen`: A [Remix]([Remix](https://remix.run) runtime adapter for [Oxygen](https://shopify.dev/custom-storefronts/oxygen)

## Formatting and Linting

Hydrogen uses ESLint for linting and Prettier for code formatting.

[Yorkie](https://github.com/yyx990803/yorkie) is used to install a Git precommit hook, which lints and formats staged commits automatically.

To manually typecheck, lint, and format:

```bash
npm run typecheck
npm run lint
npm run format
```

## Naming conventions

Hydrogen follows common React naming conventions for filenames, component names, classes, constants, and more.

- For component **filenames** and **class names**, always use `PascalCase`.
- For **non-component filenames**, always use fully lowercase `kebab-case`.
- For **test filenames**, append `.test` before the file extension.
- When declaring **instances** of components, always use `camelCase`.
- When declaring **exported constants**, always use `SCREAMING_SNAKE_CASE`.

| &nbsp;                       | ✅ Valid                                        | 🚫 Invalid                                                                          |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Component filenames:**     | `ProductTitle.tsx`<br>`ProductTitle.tsx` | `productTitle.tsx`<br>`product_title.tsx`<br>`product-title.tsx`             |
| **Non-component filenames:** | `client.ts`<br>`handle-event.ts`                | `Client.ts`<br>`handleEvent.ts`<br>`handle_event.ts`                                |
| **Test filenames:**          | `ExternalVideo.test.tsx`                        | `ExternalVideo-test.tsx`<br>`ExternalVideo_test.tsx`<br>`ExternalVideoTest.tsx`     |
| **Component classes:**       | `<AddToCartButton />`                           | `<addToCartButton />`                                                               |
| **Component instances:**     | `const cartSelector = <CartSelector />`         | `const CartSelector = <CartSelector />`<br>`const cart_selector = <CartSelector />` |
| **Exported constants:**      | `export const CART_COOKIE_TTL_DAYS = 14;`       | `export const CartCookieTTLDays = 14;`<br>`export const cart_cookie_ttl_days = 14;` |

## Changesets

If you are contributing a user-facing or noteworthy change to Hydrogen that should be added to the changelog, you should include a changeset with your PR.

To add a changeset, run this script locally:

```bash
npm run changeset add
```

Follow the prompts to select which package(s) are affected by your change, and whether the change is a major, minor or patch change. This will create a file in the `.changesets` directory of the repo. This change should be committed and included with your PR.

Considerations:

- You can use markdown in your changeset to include code examples, headings, and more. However, **please use plain text for the first line of your changeset**. The formatting of the GitHub release notes does not support headings as the first line of the changeset.
- When selecting packages for the changesets, only select packages which are published. Do not include private packages, as it will cause the build to fail. _Hopefully these are removed from the list of options in a [future Changesets release](https://github.com/changesets/changesets/issues/436)_.

## Merging PRs

When merging PRs, please select the **Squash and Merge** option, which consolidates all the changes from the PR into a single commit. This helps reduce the commit noise in our Git repository.

## Headless components

If you are building or making changes to a component, be sure to read [What are headless components?](./contributing/headlesscomponents.md) and [How to build headless components](./contributing/howtobuildheadless.md).

## Storefront API TypeScript types

You can directly import the TypeScript type from `/packages/src/storefront-api-types.ts` which will match the full shape of the object from the Storefront API. If you're working on a component, you're not guarnateed to get an object in the exact shape as that type, so wrap it in `PartialDeep` which is imported from `type-fest`. This will also force the component to be more defensive in handling optional properties.

To update the types, follow the steps below, excluding the parts where you update the version.

### Updating GraphQL and TypeScript types to a new Storefront API version

We use `graphql-codegen` to automatically generate types for all of the Storefront API objects for a given version, and that version can be found in the `codegen.yml` file.

In order to update the supported Storefront API version:

1. Update the Schema URL and the header comment in `codegen.yml`
1. Run `yarn graphql-types`
1. Fix any TypeScript errors that now appear
   1. One fast way to find them is to run `yarn build` from the monorepo root and see what TypeScript errors show up
   1. Another way is to clear the test cache with `yarn test --clearCache && yarn test`

For context, updating the `codegen.yml` file and running the script does the following:

1. Automatically hits the Storefront API, and use an introspection query to get the latest info
1. Uses the results of that query to generate a new `graphql.schema.json` (which is a local representation of the Storefront API)
1. Generates / updates the new types in `/packages/hydrogen/src/storefront-api-types.ts` based on the `graphql.schema.json`

## Testing

Hydrogen is tested with unit tests for components, hooks and utilities. It is also tested with a suite of end-to-end tests inspired by [Vite's playground tests](https://github.com/vitejs/vite/tree/main/packages/playground).

Run unit tests with:

```bash
npm run test

# Optionally watch for changes
yarn test:watch
```

### Debugging tests in Github Actions

Tests that fail **only** in CI can be difficult and time-consuming to debug. If you find yourself in this situation, you can use [tmate](https://tmate.io/) to pause the Github Action on a given step and `ssh` into the container. Once in the container you can use `vim`, inspect the file system and try determining what might be diverging from running tests on your local computer and leading to the failure.

- Add the following `step` in your Github Actions workflow:

```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
```

- Commit and push your changes to Github.
- The testing Github Action will run automatically and you will see it paused with both a Web Shell address and SSH address.

![tmate](./images/tmate.png)

- Copy and paste the SSH address into your terminal.
