import prettier, {type Options as FormatOptions} from 'prettier';
import {extname} from '@shopify/cli-kit/node/path';

export type {FormatOptions};

const DEFAULT_PRETTIER_CONFIG: FormatOptions = {
  arrowParens: 'always',
  singleQuote: true,
  bracketSpacing: false,
  trailingComma: 'all',
};

export async function getCodeFormatOptions(filePath = process.cwd()) {
  try {
    // Try to read a prettier config file from the project.
    return (await prettier.resolveConfig(filePath)) || DEFAULT_PRETTIER_CONFIG;
  } catch {
    return DEFAULT_PRETTIER_CONFIG;
  }
}

export function formatCode(
  content: string,
  config: FormatOptions = DEFAULT_PRETTIER_CONFIG,
  filePath = '',
) {
  const ext = extname(filePath);

  const formattedContent = prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });

  return formattedContent;
}
