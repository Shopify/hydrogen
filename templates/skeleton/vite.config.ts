import {
  Plugin,
  defineConfig,
  type ResolvedConfig,
  transformWithEsbuild,
} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import fs from 'node:fs/promises';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
    hydrogenBundleAnalyzer(),
  ],
  build: {
    // Allow a strict Content-Security-Policy
    // withtout inlining assets as base64:
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [],
    },
  },
});

function hydrogenBundleAnalyzer() {
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
        !workerFile.facadeModuleId
      ) {
        return;
      }

      // server.ts file
      const entryMod = this.getModuleInfo(workerFile.facadeModuleId);
      if (!entryMod) return;

      const renderedSizes = new Map<string, number>();
      const toAnalyzeMods = new Set<string>([workerFile.facadeModuleId]);
      const modsMeta = new Map<string, any>();

      for (const modId of toAnalyzeMods) {
        const mod = this.getModuleInfo(modId);
        if (!mod?.id) continue;

        const modBundleInfo = workerFile.modules[mod.id];
        const originalCodeBytes =
          modBundleInfo?.originalLength ?? mod.code?.length ?? 0;

        let resultingCodeBytes = modBundleInfo?.renderedLength ?? 0;

        if (modBundleInfo?.code) {
          const result = await transformWithEsbuild(
            modBundleInfo.code,
            mod.id,
            {
              minify: true,
              minifyWhitespace: true,
              minifySyntax: true,
              minifyIdentifiers: true,
              sourcemap: false,
              treeShaking: false,
              legalComments: 'none',
              target: 'esnext',
            },
          );

          if (result) resultingCodeBytes = result.code.length;
        }

        renderedSizes.set(path.relative(root, modId), resultingCodeBytes);

        const resolveImportString = (importString: string) =>
          this.resolve(importString, mod.id);

        let isESM =
          !mod.code ||
          /(^\s*export\s+[\w\{]|^\s*import\s+[\w\{]|\bimport\()/ms.test(
            mod.code,
          );

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
          const isCjshelper =
            importedId.endsWith('commonjsHelpers.js') ||
            importedId.includes('?commonjs');

          if (isCjshelper) {
            isESM = false;
            // const cjsHelperMod = this.getModuleInfo(importedId);
            // const cjsHelperMod = workerFile.modules[importedId];
            // if (cjsHelperMod) {
            //   cjsHelperMod.renderedLength;
            // }
          } else {
            toAnalyzeMods.add(importedId);
            acc.push(meta);
          }

          return acc;
        }, [] as Array<{path: string; kind: string; original: string}>);

        modsMeta.set(path.relative(root, modId), {
          bytes: originalCodeBytes,
          format: isESM ? 'esm' : 'cjs',
          imports: importsMeta,
        });
      }

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

      // console.dir(
      //   // {
      //   //   // entryMod,
      //   //   // importedIds: entryMod?.importedIds,
      //   //   // importedidResolutions: entryMod?.importedIdResolutions,
      //   //   // imporetrs: entryMod?.importers,
      //   //   // remixOxygen: this.getModuleInfo(
      //   //   //   '/Users/frandiox/src/github.com/Shopify/hydrogen/packages/remix-oxygen/dist/production/index.js',
      //   //   // )?.importers,
      //   // },
      //   // Object.fromEntries(modsMeta.entries()),
      //   metafile,
      //   {depth: 5},
      // );

      const analysisTemplate = await fs.readFile(
        '../../packages/cli/assets/bundle/analyzer.html',
        'utf-8',
      );

      const templateWithMetafile = analysisTemplate.replace(
        `globalThis.METAFILE = '';`,
        `globalThis.METAFILE = '${Buffer.from(
          JSON.stringify(metafile),
          'utf-8',
        ).toString('base64')}';`,
      );

      bundle['metafile.test.json'] = {
        type: 'asset',
        fileName: 'metafile.test.json',
        name: 'metafile.json',
        needsCodeReference: false,
        source: JSON.stringify(metafile, null, 2),
      };

      bundle['metafile.test.html'] = {
        type: 'asset',
        fileName: 'metafile.test.html',
        name: 'metafile.html',
        needsCodeReference: false,
        source: templateWithMetafile,
      };

      return undefined;
    },
  } satisfies Plugin;
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
    if (match) importersSet.add(match);
    const resolvedMod = await resolve(match);
    if (resolvedMod?.id === filepath) {
      return match;
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
      path: path.relative(root, importedId),
      kind,
      original: code
        ? await findOriginalImportName(importedId, code, resolveImportString)
        : importedId,
    };
  });
}
