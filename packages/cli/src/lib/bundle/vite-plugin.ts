import type {Plugin, ResolvedConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {relativePath, joinPath, dirname} from '@shopify/cli-kit/node/path';
import {readFile} from '@shopify/cli-kit/node/fs';
import {
  BUNDLE_ANALYZER_HTML_FILE,
  BUNDLE_ANALYZER_JSON_FILE,
  injectAnalyzerTemplateData,
} from './analyzer.js';

export function hydrogenBundleAnalyzer() {
  let config: ResolvedConfig;

  return {
    name: 'hydrogen:bundle-analyzer',
    configResolved(_config) {
      config = _config;
    },
    async generateBundle(options, bundle) {
      if (!config.build.ssr) return;

      const {root} = config;

      const workerFile = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk',
      );

      if (!workerFile || workerFile.type !== 'chunk') {
        return;
      }

      const analysisTemplate = await readFile(
        joinPath(
          dirname(fileURLToPath(import.meta.url)),
          'bundle-analyzer.html',
        ),
      ).catch(() => null);

      if (!analysisTemplate) {
        console.warn('Bundle analyzer template not found');
        return;
      }

      const renderedSizes = new Map<string, number>();
      const modsMeta = new Map<string, any>();

      const {transformWithEsbuild} = await import('vite');

      await Promise.all(
        Object.keys(workerFile.modules).map(async (modId) => {
          if (isViteCjsHelper(modId) || isViteTransformHelper(modId)) {
            return;
          }

          const mod = this.getModuleInfo(modId);
          if (!mod?.id) return;

          const modBundleInfo = workerFile.modules[mod.id];
          const originalCodeBytes =
            modBundleInfo?.originalLength ?? mod.code?.length ?? 0;

          let resultingCodeBytes = modBundleInfo?.renderedLength ?? 0;

          if (config?.build.minify && modBundleInfo?.code) {
            const result = await transformWithEsbuild(
              modBundleInfo.code,
              mod.id,
              {
                minify: true,
                minifyWhitespace: true,
                minifySyntax: true,
                minifyIdentifiers: true,
                sourcemap: false,
                treeShaking: false, // Tree-shaking would drop most exports in routes
                legalComments: 'none',
                target: 'esnext',
              },
            ).catch(() => null);

            if (result) resultingCodeBytes = result.code.length;
          }

          renderedSizes.set(relativePath(root, modId), resultingCodeBytes);

          const resolveImportString = (importString: string) =>
            this.resolve(importString, mod.id);

          let isESM =
            !mod.code ||
            /(^\s*export\s+[\w\{]|^\s*import\s+[\w\{'"]|\bimport\()|\bcreateRequire\(/ms.test(
              mod.code,
            ) ||
            !/((^|\b)exports\b|\brequire\()/.test(mod.code);

          const staticImportsMeta = createImportsMeta(
            mod.importedIds,
            'import-statement',
            root,
            resolveImportString,
            mod.code,
          );

          const dynamicImportsMeta = createImportsMeta(
            mod.dynamicallyImportedIds,
            'dynamic-import',
            root,
            resolveImportString,
            mod.code,
          );

          const importsMeta = (
            await Promise.all([...staticImportsMeta, ...dynamicImportsMeta])
          ).reduce((acc, {importedId, ...meta}) => {
            if (isViteCjsHelper(importedId)) {
              // Helpers are CJS
              isESM = false;
            } else if (!isViteTransformHelper(importedId)) {
              acc.push(meta);
            }

            return acc;
          }, [] as Array<{path: string; kind: string; original: string}>);

          modsMeta.set(relativePath(root, modId), {
            bytes: originalCodeBytes,
            format: isESM ? 'esm' : 'cjs',
            imports: importsMeta,
          });
        }),
      );

      const inputs = Object.fromEntries(modsMeta.entries());
      const metafile = {
        inputs,
        outputs: {
          'dist/server/index.js': {
            imports: [],
            exports: ['default'],
            entryPoint: 'server.ts',
            inputs: Object.entries(inputs).reduce((acc, [key, item]) => {
              acc[key] = {
                bytesInOutput: renderedSizes.get(key) ?? item.bytes ?? 0,
              };
              return acc;
            }, {} as Record<string, {bytesInOutput: number}>),
            bytes: workerFile.code.length ?? 0,
          },
        },
      };

      bundle[BUNDLE_ANALYZER_JSON_FILE] = {
        type: 'asset',
        fileName: BUNDLE_ANALYZER_JSON_FILE,
        name: BUNDLE_ANALYZER_JSON_FILE,
        needsCodeReference: false,
        source: JSON.stringify(metafile, null, 2),
      };

      bundle[BUNDLE_ANALYZER_HTML_FILE] = {
        type: 'asset',
        fileName: BUNDLE_ANALYZER_HTML_FILE,
        name: BUNDLE_ANALYZER_HTML_FILE,
        needsCodeReference: false,
        source: injectAnalyzerTemplateData(
          analysisTemplate,
          JSON.stringify(metafile),
        ),
      };

      return undefined;
    },
  } satisfies Plugin;
}

// Known Vite's CommonJS helpers that we can ignore in the bundle analysis
function isViteCjsHelper(id: string) {
  // Every CommonJS module adds an extra helper file.
  return /(commonjsHelpers\.js$|\?commonjs\-)/.test(id);
}

// Known Vite's transform helpers that we can ignore in the bundle analysis
function isViteTransformHelper(id: string) {
  // Every CSS style adds a transform-only file.
  return id.endsWith('?transform-only');
}

async function findOriginalImportName(
  filepath: string,
  importerCode: string,
  resolve: (id: string) => any,
) {
  const importersSet = new Set<string>();

  const matches =
    importerCode.matchAll(/import\s[^'"]*?['"]([^'"]+)['"]/g) ?? [];

  for (const [, match] of matches) {
    if (match) {
      importersSet.add(match);
      const resolvedMod = await resolve(match);
      if (resolvedMod?.id === filepath) {
        return match;
      }
    }
  }

  return filepath;
}

function createImportsMeta(
  ids: readonly string[],
  kind: string,
  root: string,
  resolveImportString: (id: string) => Promise<{id: string} | null>,
  code: string | null,
) {
  return ids.map(async (importedId: string) => {
    return {
      importedId,
      path: relativePath(root, importedId),
      kind,
      original: code
        ? await findOriginalImportName(importedId, code, resolveImportString)
        : importedId,
    };
  });
}
