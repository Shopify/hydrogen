COMPILE_DOCS="generate-docs --overridePath ./docs/typeOverride.json --input ./src --output ./docs/generated"

if [ "$1" = "isTest" ];
then
COMPILE_DOCS="generate-docs --overridePath ./docs/typeOverride.json --input ./src --output ./docs/temp"
fi

eval $COMPILE_DOCS
