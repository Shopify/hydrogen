# Query Validation

Validate every `gql()` document headlessly before treating Hydrogen setup as complete. Editor feedback is not enough: the `gql.tada/ts-plugin` runs inside the editor's TypeScript language server, but it does not run during `tsc`.

Without a headless check, a query that references a missing or renamed field can typecheck and fail only at runtime. On a product page, that can look like an empty result and get accidentally converted into a misleading 404.

## Install The CLI

Install `gql.tada` as a dev dependency in the app that owns the queries:

```bash
pnpm add -D gql.tada
```

Use the app's package manager equivalent when it is not pnpm.

## Configure The Schema

The CLI reads the same `tsconfig.json` plugin block used by the editor:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "gql.tada/ts-plugin",
        "schema": "node_modules/@shopify/hydrogen/src/graphql/generated/storefront.schema.graphql",
        "trackFieldUsage": false
      }
    ]
  }
}
```

If the app already has TypeScript plugins, append the `gql.tada/ts-plugin` entry without removing framework plugins such as Next.js `name: "next"`. If the app's `tsconfig.json` extends a generated framework config, put `compilerOptions.plugins` in the extending `tsconfig.json`.

The schema path above is shipped by the `@shopify/hydrogen` package.

The editor must use the workspace TypeScript version for inline feedback. The CLI works independently of the editor setting.

## Add A CI Check

Add a script that runs the GraphQL validation:

```jsonc
// package.json
{
  "scripts": {
    "check:graphql": "gql.tada check"
  }
}
```

Then chain it into the existing typecheck or check command. Run the framework's route type generation first when the app needs it, then TypeScript, then the GraphQL check:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "react-router typegen && tsc && gql.tada check"
  }
}
```

For apps without route type generation, use the same ordering without that first command:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "tsc && gql.tada check"
  }
}
```

For framework typecheck commands, append the GraphQL check after the framework check.

Run `gql.tada check` directly before finishing any setup that added or changed Storefront API queries, even if the app does not already have CI configured.

For stricter CI, use `gql.tada check --fail-on-warn` so warning-level findings fail the build too.

## What It Catches

- Fields that do not exist on the selected type.
- Invalid arguments or argument types.
- Invalid selections, such as selecting subfields from a scalar.
- Other schema validation errors available from the bundled Storefront API schema.

## What It Does Not Catch

- Store-specific runtime constraints.
- API-version drift where the bundled schema accepts a field but the target store rejects it.
- Auth, market, or argument-value errors that only the live API can enforce.

For live-only failures, add an integration test or smoke check that executes each critical query and asserts the response has no `errors` value.
