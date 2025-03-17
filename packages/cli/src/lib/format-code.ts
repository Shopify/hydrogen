import type {Options as FormatOptions} from 'prettier';
import {extname} from '@shopify/cli-kit/node/path';
import * as prettier from 'prettier';
import * as FS from 'fs/promises';
import * as Path from 'path';

export type {FormatOptions};

const DEFAULT_PRETTIER_CONFIG: FormatOptions = {
  arrowParens: 'always',
  singleQuote: true,
  bracketSpacing: false,
  trailingComma: 'all',
};

export async function getCodeFormatOptions(filePath = process.cwd()) {
  // Appears the semantics of `resolveConfig` have changed:
  // https://github.com/prettier/prettier/issues/16344
  const pathToUse = (await FS.lstat(filePath)).isFile()
    ? filePath
    : Path.resolve(filePath, 'prettier.file');
  try {
    // Try to read a prettier config file from the project.
    return (await prettier.resolveConfig(pathToUse)) || DEFAULT_PRETTIER_CONFIG;
  } catch {
    return DEFAULT_PRETTIER_CONFIG;
  }
}

export async function formatCode(
  content: string,
  config: FormatOptions = DEFAULT_PRETTIER_CONFIG,
  filePath = '',
) {
  const ext = extname(filePath);
  return prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser instead of the default parser,
    // because prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });
}
