# @shopify/cli-hydrogen

The Hydrogen extension for the [Shopify CLI](https://shopify.dev/apps/tools/cli). Hydrogen is a set of tools, utilities, and best-in-class examples for building a commerce application with [Remix](https://wwww.remix.run).

[Check out the docs](https://shopify.dev/custom-storefronts/hydrogen)

## JSON output

Finite commands support `--json` and `--json-schema`:

```sh
shopify hydrogen list --json
shopify hydrogen env pull --force --json
shopify hydrogen deploy --json-schema
```

Successful results are written as one JSON document to stdout. Progress and
diagnostics use JSON events on stderr. Fatal errors use the CLI's shared error
document and a nonzero exit status. JSON output does not change confirmation
prompts or authentication requirements.

Environment pull and push return receipts containing variable names and file
details, without printing variable values. Deployment's `--json-output` option
still controls its CI file independently of `--json`.

`dev`, `preview`, and `debug cpu` are streaming commands. The finite JSON result
format also excludes `build --watch` and `codegen --watch`.

## Contributing

The most common way to test the cli changes locally is to do the following:

- Run `pnpm run build` in this directory (`packages/cli` from the root of the repo).
- Run `npx shopify hydrogen` anywhere else in the monorepo, for example `npx shopify hydrogen init`.
- If you want to test a command inside of a template, run the command from within that template or use the `--path` flag to point to another template or any Hydrogen app.
- If you want to make changes to a file that is generated when running `npx shopify hydrogen generate`, make changes to that file from inside of the `templates/skeleton` directory.
