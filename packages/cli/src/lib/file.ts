import {resolvePath} from '@shopify/cli-kit/node/path';
import {readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {readdir} from 'fs/promises';
import {formatCode, type FormatOptions} from './format-code.js';

export async function replaceFileContent(
  filepath: string,
  formatConfig: FormatOptions | false,
  replacer: (
    content: string,
  ) => Promise<string | null | undefined> | string | null | undefined,
) {
  let content = await replacer(await readFile(filepath));
  if (typeof content !== 'string') return;

  if (formatConfig) {
    content = formatCode(content, formatConfig, filepath);
  }

  return writeFile(filepath, content);
}

const DEFAULT_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js', 'mjs', 'cjs'] as const;

export async function findFileWithExtension(
  directory: string,
  fileBase: string,
  extensions = DEFAULT_EXTENSIONS,
) {
  const dirFiles = await readdir(directory);

  for (const extension of extensions) {
    const filename = `${fileBase}.${extension}`;
    if (dirFiles.includes(filename)) {
      const astType =
        extension === 'mjs' || extension === 'cjs' ? 'js' : extension;

      return {filepath: resolvePath(directory, filename), extension, astType};
    }
  }

  return {};
}
