# Hydrogen examples

The example apps in this directory show how to implement popular design patterns in Hydrogen.

Each example only contains the files that are different from Hydrogen’s [Skeleton template](/templates/skeleton/), but it's still possible to inspect and run them locally. See each example's README file for details on the problem it solves, how the solution works, and any other requirements you’ll need.

Examples are kept intentionally minimal, containing only the new and updated code required to illustrate a working use case.

## Popular examples

These are some of the most commonly used Hydrogen examples. Browse the folders in this directory for the complete list.

Example | Details |
--- | ---
[Multipass](/examples/multipass/) | Connect your existing third-party authentication method to Shopify’s customer accounts, so buyers can use a single login across multiple services.

## Request an example

If you don’t see the example you’re looking for, you can [request one through the Discussions tab](https://github.com/Shopify/hydrogen/discussions/new?category=ideas-feature-requests&title=Hydrogen%20example%20request%3A%20%5BYour%20request%20here%5D%0A%0A).

## Contributing examples

Hydrogen is an open-source project, and we welcome your input! See the Hydrogen [contribution docs](/docs/examples/README.md) for more details on how to add your own examples to this repo.

### Creating new examples as diffs

An example diff is a partial Hydrogen app that only contains the files that change from the skeleton template. The Hydrogen CLI will merge the example diff on top of the skeleton template in a temporary directory before running the `dev` or `build` commands.

Keep the following in mind when creating a new example diff:

- Start a new example diff by copying another minimal example and changing code.
- Only include and commit files that are different from the skeleton template.
- `package.json` must always be created with a unique name, and this name must be included in the NPM workspace (root `package.json`).
- `dependencies`, `devDependencies`, and `peerDependencies` in `package.json` are also merged to those in skeleton. Therefore, only list new or modified dependencies in the example.
- The scripts in `package.json` must pass the `--diff` flag to the `dev` and `build` commands. Otherwise, it will be treated as a full Hydrogen app instead of a diff.
- The `tsconfig.json` must have special values. Copy it from another existing diff example.
