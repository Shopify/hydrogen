import { extname } from '@shopify/cli-kit/node/path';
import * as prettier from 'prettier';

const DEFAULT_PRETTIER_CONFIG = {
  arrowParens: "always",
  singleQuote: true,
  bracketSpacing: false,
  trailingComma: "all"
};
async function getCodeFormatOptions(filePath = process.cwd()) {
  try {
    return await prettier.resolveConfig(filePath) || DEFAULT_PRETTIER_CONFIG;
  } catch {
    return DEFAULT_PRETTIER_CONFIG;
  }
}
async function formatCode(content, config = DEFAULT_PRETTIER_CONFIG, filePath = "") {
  const ext = extname(filePath);
  return prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === ".tsx" || ext === ".ts" ? "typescript" : "babel",
    ...config
  });
}

export { formatCode, getCodeFormatOptions };
