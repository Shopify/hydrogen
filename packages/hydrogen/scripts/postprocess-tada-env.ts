import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GRAPHQL_ENV_PATHS = [
  resolve(import.meta.dirname, "../src/graphql/generated/graphql-env.d.ts"),
  resolve(import.meta.dirname, "../src/graphql/generated/customer-account-graphql-env.d.ts"),
];

// gql.tada emits ambient module augmentations, but Hydrogen ships separate
// Storefront and Customer Account GraphQL entrypoints that must keep their
// schemas isolated from each other.
const AMBIENT_BLOCK_RE =
  /\nimport \* as gqlTada[^\n]*\n+declare module 'gql\.tada' \{[\s\S]*?\n\}\s*$/g;
const TRAILING_GQL_TADA_IMPORT_RE = /\nimport \* as gqlTada[^\n]*\s*$/g;

for (const graphqlEnvPath of GRAPHQL_ENV_PATHS) {
  const source = readFileSync(graphqlEnvPath, "utf-8");
  const stripped = source
    .replace(AMBIENT_BLOCK_RE, "\n")
    .replace(TRAILING_GQL_TADA_IMPORT_RE, "\n");

  if (stripped === source) {
    console.log(`No ambient augmentation found in ${graphqlEnvPath} — nothing to strip.`);
  } else {
    writeFileSync(graphqlEnvPath, stripped);
    console.log(`Stripped \`declare module "gql.tada"\` block from ${graphqlEnvPath}`);
  }
}
