# Query Validation

Validate every Storefront API `gql()` document headlessly before treating Hydrogen setup as complete. Editor feedback is not enough: the Hydrogen TypeScript plugin runs inside the editor's language server, but it does not run during `tsc`.

Without a headless check, a query that references a missing or renamed field can typecheck and fail only at runtime. On a product page, that can look like an empty result and get accidentally converted into a misleading 404.

## Configure The Schema

Hydrogen's packed plugin configures both Shopify schemas:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@shopify/hydrogen/ts-plugin"
      }
    ]
  }
}
```

If the app already has TypeScript plugins, append the Hydrogen plugin without removing framework plugins such as Next.js `name: "next"`. If the app's `tsconfig.json` extends a generated framework config, put `compilerOptions.plugins` in the extending `tsconfig.json`.

The plugin writes `storefront-graphql-env.d.ts` and `customer-account-graphql-env.d.ts` at the project root. Ignore these generated files. Customer Account API documents use the separate `@shopify/hydrogen/customer-account` helper but need no additional plugin configuration.

The editor must use the workspace TypeScript version for inline feedback. The CLI works independently of the editor setting.

## Add A CI Check

Add a script that runs the GraphQL validation:

```jsonc
// package.json
{
  "scripts": {
    "check:graphql": "hydrogen gql check"
  }
}
```

Then chain it into the existing typecheck or check command. Run the framework's route type generation first when the app needs it, then TypeScript, then the GraphQL check:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "react-router typegen && tsc && hydrogen gql check"
  }
}
```

For apps without route type generation, use the same ordering without that first command:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "tsc && hydrogen gql check"
  }
}
```

For framework typecheck commands, append the GraphQL check after the framework check.

Run the package script before finishing any setup that added or changed Storefront API or Customer Account API queries, including additive fragments passed to Hydrogen helpers such as predictive search query builders. Without a script, run `npx @shopify/hydrogen gql check`.

For stricter CI, append `--fail-on-warn` to the package script so warning-level findings fail the build too.

## What It Catches

- Fields that do not exist on the selected type.
- Invalid arguments or argument types.
- Invalid selections, such as selecting subfields from a scalar.
- Other schema validation errors available from the bundled Shopify GraphQL schemas.

## What It Does Not Catch

- Store-specific runtime constraints.
- API-version drift where the bundled schema accepts a field but the target store rejects it.
- Auth, market, or argument-value errors that only the live API can enforce.

For live-only failures, add an integration test or smoke check that executes each critical query and asserts the response has no `errors` value.

## Select `__typename` When You Narrow On It

gql.tada does NOT auto-inject `__typename` for inline fragments (`... on MediaImage { ... }`). Whenever you narrow runtime nodes by `__typename` (`search.nodes`, `product.media.nodes`, any heterogeneous `nodes` union), select `__typename` explicitly — otherwise a guard like `node.__typename === "MediaImage"` silently yields empty (no type or runtime error, just missing output).

```graphql
# bad — guard never matches
query { product { media(first: 10) { nodes { ... on MediaImage { url } } } } }
# good
query { product { media(first: 10) { nodes { __typename ... on MediaImage { url } } } } }
```
