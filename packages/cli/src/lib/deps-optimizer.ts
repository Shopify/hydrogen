import type {ViteDevServer} from 'vite';
import {AbortError} from '@shopify/cli-kit/node/error';
import {readFile} from '@shopify/cli-kit/node/fs';
import {extname} from '@shopify/cli-kit/node/path';
import {getCodeFormatOptions, type FormatOptions} from './format-code.js';
import {importLangAstGrep} from './ast.js';
import {replaceFileContent} from './file.js';
import {addMessageReplacers} from './log.js';

export async function setupDepsOptimizer(
  viteServer: ViteDevServer,
  onSuccess?: (addedDependency: string) => void,
) {
  const formatOptions = await getCodeFormatOptions(viteServer.config.root);
  const re = /ReferenceError: \w+ is not defined/i;

  addMessageReplacers('vite-optimize-deps', [
    ([first]) => {
      const item = first?.stack ?? first;
      return (
        typeof item === 'string' &&
        re.test(item) &&
        // Only for errors in dependencies
        !!item.split('\n')[1]?.includes('node_modules')
      );
    },
    ([item]) => {
      const stack = (item.stack ?? item).replace(
        /^\s+at\s[^\n]+?\/mini-oxygen\/[^\n]+\n/gm,
        '',
      );

      // Examples:
      //  at /Users/.../node_modules/my-dep/index.js:15:1
      //  at eval (/Users/.../node_modules/my-dep/index.js?v=75108676:17:1)
      const filepath = stack
        .match(/^\s+at\s([^:\?]+)(\?|:\d)/m)?.[1]
        ?.replace(/^.*?\(/, '')
        .replace(/\?.+$/, '');

      tryToOptimizeDep(filepath, viteServer, formatOptions)
        .then((dep) => {
          if (dep && onSuccess) onSuccess(dep);
        })
        .catch((warning) => {
          process.stderr.write(stack);
          if (warning instanceof AbortError) throw warning;
          else process.stdout.write('\n' + warning.stack);
        });
    },
  ]);
}

// AST-Grep rule for finding`ssr.optimizeDeps.include: []` in Vite config
const ssrOptimizeDepsIncludeRule = {
  rule: {
    pattern: '[$$$]',
    inside: {
      kind: 'pair',
      stopBy: 'end',
      has: {
        field: 'key',
        regex: 'include',
        stopBy: 'end',
      },
      inside: {
        kind: 'pair',
        stopBy: 'end',
        has: {
          field: 'key',
          regex: 'optimizeDeps',
          stopBy: 'end',
        },
        inside: {
          kind: 'pair',
          stopBy: 'end',
          has: {
            field: 'key',
            regex: 'ssr',
            stopBy: 'end',
          },
        },
      },
    },
  },
};

async function tryToOptimizeDep(
  filepath: string,
  viteServer: ViteDevServer,
  formatOptions: FormatOptions,
) {
  const mods = viteServer.moduleGraph.getModulesByFile(filepath);
  const modImporters = new Set<string>();

  mods?.forEach((mod) => {
    mod.importers.forEach((importer) => {
      if (importer.file) modImporters.add(importer.file);
    });
  });

  const importersSet = new Set<string>();
  for (const mod of modImporters) {
    const code = await readFile(mod).catch(() => '');
    const matches =
      code.matchAll(/import\s[^'"]+\sfrom\s+['"]((@|\w)[^'"]+)['"]/g) ?? [];

    for (const match of matches) {
      importersSet.add(match[1]!);
    }
  }

  const importers = Array.from(importersSet).sort(
    (a, b) => b.length - a.length,
  );
  const nodeModulesPath = filepath.split(/node_modules[\\\/]/)[1]!;

  const match = importers.find((importer) =>
    nodeModulesPath.startsWith(importer),
  );

  const {configFile} = viteServer.config;

  if (!configFile || !match) return;

  const ext = extname(configFile).replace(/^\.m?/, '') as 'ts' | 'js';
  const astGrep = await importLangAstGrep(ext);

  await replaceFileContent(configFile, formatOptions, (content) => {
    const root = astGrep.parse(content).root();
    const node = root.find(ssrOptimizeDepsIncludeRule);

    if (!node) {
      throw new AbortError(
        `The dependcy "${match}" needs to be optimized but couldn't be added to the Vite config.`,
        `Add the following code manually to your Vite config:\n\nssr: {optimizeDeps: {include: ['${match}']}}`,
      );
    }

    const isAlreadyAdded = !!node.find({
      rule: {
        kind: 'string_fragment',
        regex: `^${match}$`,
      },
    });

    if (isAlreadyAdded) return null; // Skip write

    const {start} = node.range();

    return (
      content.slice(0, start.index + 1) +
      `'${match}',` +
      content.slice(start.index + 1)
    );
  });

  return match;
}
