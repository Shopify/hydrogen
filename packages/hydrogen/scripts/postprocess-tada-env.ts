import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GRAPHQL_ENV_PATH = resolve(import.meta.dirname, "../src/graphql/generated/graphql-env.d.ts");

const AMBIENT_BLOCK_RE =
  /\nimport \* as gqlTada[^\n]*\n+declare module 'gql\.tada' \{[\s\S]*?\n\}\s*$/g;

const source = readFileSync(GRAPHQL_ENV_PATH, "utf-8");
const stripped = source.replace(AMBIENT_BLOCK_RE, "\n");

if (stripped === source) {
  console.log("No ambient augmentation found — nothing to strip.");
} else {
  writeFileSync(GRAPHQL_ENV_PATH, stripped);
  console.log('Stripped `declare module "gql.tada"` block from graphql-env.d.ts');
}
