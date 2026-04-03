OUTPUT_DIR="./docs/generated"
V2_TEMP_DIR="./docs/generated_v2_temp"

COMPILE_DOCS_V2="generate-docs --overridePath ./docs/typeOverride.json --input ./src --output $V2_TEMP_DIR"
COMPILE_DOCS="npx tsc --project docs/tsconfig.docs.json --types react --moduleResolution node  --target esNext  --module CommonJS && generate-docs --overridePath ./docs/typeOverride.json --input ./src --output $OUTPUT_DIR && rm -rf src/**/*.doc.js src/*.doc.js"
COMPILE_STATIC_PAGES="npx tsc docs/staticPages/*.doc.ts --types react --moduleResolution node  --target esNext  --module CommonJS && generate-docs --isLandingPage --input ./docs/staticPages --output $OUTPUT_DIR && rm -rf docs/staticPages/*.doc.js"

if [ "$1" = "isTest" ];
then
OUTPUT_DIR="./docs/temp"
V2_TEMP_DIR="./docs/temp_v2"
COMPILE_DOCS_V2="generate-docs --overridePath ./docs/typeOverride.json --input ./src --output $V2_TEMP_DIR"
COMPILE_DOCS="npx tsc --project docs/tsconfig.docs.json --types react --moduleResolution node  --target esNext  --module CommonJS && generate-docs --overridePath ./docs/typeOverride.json --input ./src --output $OUTPUT_DIR && rm -rf src/**/*.doc.js src/*.doc.js"
COMPILE_STATIC_PAGES="npx tsc docs/staticPages/*.doc.ts --types react --moduleResolution node  --target esNext  --module CommonJS && generate-docs --isLandingPage --input ./docs/staticPages --output $OUTPUT_DIR && rm -rf docs/staticPages/*.doc.js"
fi

eval $COMPILE_DOCS_V2
eval $COMPILE_DOCS
eval $COMPILE_STATIC_PAGES

cp "$V2_TEMP_DIR/generated_docs_data_v2.json" "$OUTPUT_DIR/generated_docs_data_v2.json"
rm -rf "$V2_TEMP_DIR"

if [ "$1" != "isTest" ];
then
node ./docs/copy-docs-to-shopify-dev.mjs
fi
