import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  readFile,
  writeFile,
  fileExists,
  isDirectory,
} from '@shopify/cli-kit/node/fs';
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

  if (dirFiles.includes(fileBase)) {
    const filepath = resolvePath(directory, fileBase);
    if (!(await isDirectory(filepath))) {
      return {filepath};
    }

    for (const extension of ['ts', 'js'] as const) {
      const filepath = resolvePath(directory, `${fileBase}/index.${extension}`);
      if (await fileExists(resolvePath(directory, filepath))) {
        return {filepath, extension, astType: extension};
      }
    }
  } else {
    for (const extension of extensions) {
      const filename = `${fileBase}.${extension}`;
      if (dirFiles.includes(filename)) {
        const astType =
          extension === 'mjs' || extension === 'cjs' ? 'js' : extension;

        return {filepath: resolvePath(directory, filename), extension, astType};
      }
    }
  }

  return {};
}
