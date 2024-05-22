import {Plugin, defineConfig, type ResolvedConfig} from 'vite';
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

        // TODO find minified code size?
        renderedSizes.set(
          path.relative(config.root, modId),
          modBundleInfo?.renderedLength ??
            modBundleInfo?.originalLength ??
            mod.code?.length ??
            0,
        );

        modsMeta.set(path.relative(config.root, modId), {
          bytes: modBundleInfo?.originalLength ?? mod.code?.length ?? 0,
          // TODO check for cjs
          format: 'esm',
          imports: await Promise.all(
            // TODO consider dynamic imports
            // eslint-disable-next-line no-loop-func
            mod.importedIds.map(async (id: string) => {
              toAnalyzeMods.add(id);
              return {
                path: path.relative(config.root, id),
                kind: 'import-statement',
                original: mod.code
                  ? (await findOriginalImportName(id, mod.code, (id) =>
                      this.resolve(id, mod.id),
                    )) ?? id
                  : id,
              };
            }),
          ),
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
        '../../packages/cli/src/lib/bundle/bundle-analyzer.html',
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
}
