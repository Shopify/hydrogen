#!/bin/bash
set -e

OUTPUT_DIR="./docs/generated"
if [ "$1" = "isTest" ]; then
  OUTPUT_DIR="./docs/temp"
fi

# src/vue is left out because its exports share names with src/react, and generate-docs keeps only one.
generate-docs \
  --overridePath ./docs/typeOverride.json \
  --input ./src/cli ./src/client ./src/core ./src/customer-account ./src/graphql ./src/react ./src/ts-plugin ./src/ucp ./src/vite \
  --output "$OUTPUT_DIR"

# Symbol-keyed members come out as `__@name@<id>`, where <id> is a TypeScript checker counter
# that shifts whenever any source file changes. Drop it so the output only changes with the docs.
node -e '
const fs = require("node:fs");
const file = process.argv[1];
fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/(__@[\w$]+)@\d+/g, "$1"));
' "$OUTPUT_DIR/generated_docs_data_v2.json"
