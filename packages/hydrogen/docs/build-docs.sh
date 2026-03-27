COMPILE_DOCS="generate-docs --overridePath ./docs/typeOverride.json --input ./src ../hydrogen-react/src --output ./docs/generated"

if [ "$1" = "isTest" ];
then
COMPILE_DOCS="generate-docs --overridePath ./docs/typeOverride.json --input ./src ../hydrogen-react/src --output ./docs/temp"
fi

eval $COMPILE_DOCS

if [ "$1" != "isTest" ];
then
node ./docs/copy-docs-to-shopify-dev.mjs
fi
