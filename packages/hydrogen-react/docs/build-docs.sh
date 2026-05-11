#!/bin/bash
set -e

OUTPUT_DIR="./docs/generated"
if [ "$1" = "isTest" ]; then
  OUTPUT_DIR="./docs/temp"
fi

generate-docs --input ./src --output "$OUTPUT_DIR"

if [ "$1" != "isTest" ]; then
  node ./docs/copy-docs-to-shopify-dev.mjs
fi
