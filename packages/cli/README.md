# @shopify/cli-hydrogen

The Hydrogen extension for the [Shopify CLI](https://shopify.dev/apps/tools/cli). Hydrogen is a set of tools, utilities, and best-in-class examples for building a commerce application with [Remix](https://wwww.remix.run).

[Check out the docs](https://shopify.dev/custom-storefronts/hydrogen)

## Contributing

The most common way to test the cli changes locally is to do the following:

- Run `npm run build` in this directory (`packages/cli` from the root of the repo).
- Run `npx shopify hydrogen` anywhere else in the monorepo, for example `npx shopify hydrogen init`.
- If you want to test a command inside of a template, run the command from within that template or use the `--path` flag to point to another template or any Hydrogen app.
- If you want to make changes to a file that is generated when running `npx shopify hydrogen generate`, make changes to that file from inside of the `templates/skeleton` directory.
