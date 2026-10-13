#!/bin/bash
set -e

OUTPUT_DIR="./docs/generated"
if [ "$1" = "isTest" ]; then
  OUTPUT_DIR="./docs/temp"
fi

# src/vue is left out because its exports share names with src/react, and generate-docs keeps only one.
generate-docs \
  --overridePath ./docs/typeOverride.json \
  --input ./src/cli ./src/client ./src/core ./src/customer-account ./src/graphql ./src/react ./src/ts-plugin ./src/vite \
  --output "$OUTPUT_DIR"
