import type {Plugin, ResolvedConfig} from 'vite';
import {relativePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  BUNDLE_ANALYZER_HTML_FILE,
  BUNDLE_ANALYZER_JSON_FILE,
  getAnalyzerTemplate,
  injectAnalyzerTemplateData,
} from './analyzer.js';

// Minimal module info type
type ModuleInfo = {
  id: string;
  code: string | null;
  importedIds: readonly string[];
  dynamicallyImportedIds: readonly string[];
};

type BundleAnalyzerOptions = {
  minify?: (code: string, filepath: string) => Promise<string>;
};

export function hydrogenBundleAnalyzer(pluginOptions?: BundleAnalyzerOptions) {
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

      if (
        !workerFile ||
        workerFile.type !== 'chunk' ||
        !workerFile.facadeModuleId ||
        !options.dir
      ) {
        return;
      }

      const analysisTemplate = await getAnalyzerTemplate().catch(() => null);

      if (!analysisTemplate) {
        console.warn('Bundle analyzer template not found');
        return;
      }

      const allModIds = new Set<string>(Object.keys(workerFile.modules));
      const modsToAnalyze: ModuleInfo[] = [];

      // Synchrounously collect all modules to analyze. Rollup doesn't provide
      // tree-shaked modules in `workerFile.modules` so we need to traverse
      // every module's imported ids to find all modules.
      // Do this before starting async operations so that we can run those in parallel.
      for (const modId of allModIds) {
        if (isViteCjsHelper(modId) || isViteTransformHelper(modId)) continue;

        const mod = this.getModuleInfo(modId);
        if (!mod?.id) continue;

        modsToAnalyze.push(mod);

        for (const importedId of [
          ...mod.importedIds,
          ...mod.dynamicallyImportedIds,
        ]) {
          if (
            !isViteCjsHelper(importedId) &&
            !isViteTransformHelper(importedId)
          ) {
            allModIds.add(importedId);
          }
        }
      }

      const modsMeta = new Map<string, any>();
      const renderedSizes = new Map<string, number>();

      const resultError = await Promise.all(
        modsToAnalyze.map(async (mod) => {
          const relativeModId = relativePath(root, mod.id);
          const modBundleInfo = workerFile.modules[mod.id];
          const originalCodeBytes =
            modBundleInfo?.originalLength ?? mod.code?.length ?? 0;

          let resultingCodeBytes = modBundleInfo?.renderedLength ?? 0;

          if (pluginOptions?.minify && modBundleInfo?.code) {
            const minifiedCode = await pluginOptions
              .minify(modBundleInfo.code, mod.id)
              .catch(() => null);

            if (minifiedCode) resultingCodeBytes = minifiedCode.length;
          }

          renderedSizes.set(relativeModId, resultingCodeBytes);

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
          ).reduce(
            (acc, {importedId, ...meta}) => {
              if (isViteCjsHelper(importedId)) {
                // Helpers are CJS
                isESM = false;
              } else if (!isViteTransformHelper(importedId)) {
                acc.push(meta);
              }

              return acc;
            },
            [] as Array<{path: string; kind: string; original: string}>,
          );

          modsMeta.set(relativeModId, {
            bytes: originalCodeBytes,
            format: isESM ? 'esm' : 'cjs',
            imports: importsMeta,
          });
        }),
      )
        .then(() => null)
        .catch((error) => error as Error);

      if (resultError) {
        console.warn(
          'Bundle analyzer failed to analyze the bundle:',
          resultError,
        );

        return;
      }

      const inputs = Object.fromEntries(modsMeta.entries());
      const metafile = {
        inputs,
        outputs: {
          [relativePath(root, joinPath(options.dir, workerFile.fileName))]: {
            imports: workerFile.imports,
            exports: workerFile.exports,
            entryPoint: relativePath(root, workerFile.facadeModuleId),
            bytes: workerFile.code.length ?? 0,
            inputs: Object.entries(inputs).reduce(
              (acc, [key, item]) => {
                acc[key] = {
                  bytesInOutput: renderedSizes.get(key) ?? item.bytes ?? 0,
                };
                return acc;
              },
              {} as Record<string, {bytesInOutput: number}>,
            ),
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

type ModuleResolver = (id: string) => Promise<{id: string} | null>;
/**
 * Check the source code for the original import name that,
 * once resolved to a file, matches the given filepath.
 */
async function findOriginalImportName(
  filepath: string,
  importerCode: string,
  resolve: ModuleResolver,
) {
  const matches =
    importerCode.matchAll(/import\s[^'"]*?['"]([^'"]+)['"]/g) ?? [];

  for (const [, match] of matches) {
    if (match) {
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
  resolveImportString: ModuleResolver,
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
