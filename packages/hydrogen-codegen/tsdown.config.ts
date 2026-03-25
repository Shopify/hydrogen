import fs from 'node:fs/promises';
import {defineConfig} from 'tsdown';
import {generateDtsBundle} from 'dts-bundle-generator';

const commonConfig = {
  minify: false,
  unbundle: true,
  treeshake: true,
  sourcemap: true,
  fixedExtension: false,
  deps: {
    skipNodeModulesBundle: true,
  },
};

export default defineConfig([
  {
    ...commonConfig,
    format: 'esm',
    entry: ['src/**/*.ts'],
    outDir: 'dist/esm',
    // The default DTS generation does not bundle types properly for this
    // package, so use dts-bundle-generator instead.
    dts: false,
    async onSuccess() {
      const schemaFile = 'dist/esm/schema.js';
      const content = await fs.readFile(schemaFile, 'utf8');
      // Uncomment createRequire for ESM:
      await fs.writeFile(schemaFile, content.replace(/\/\/!/g, ''));

      const [dts] = await generateDtsBundle([
        {
          filePath: './src/index.ts',
          libraries: {
            // Bundle types from these libraries to avoid
            // the need to install them as dependencies in consumers.
            // Specifically, 'type-fest' might be installed in a consumer
            // with an older version that doesn't include `IsNever` or
            // a similar type.
            inlinedLibraries: ['@shopify/graphql-codegen', 'type-fest'],
          },
          output: {noBanner: true},
        },
      ]);

      await fs.writeFile(
        'dist/esm/index.d.ts',
        // For some reason, dts-bundle-generator exports PresetConfig
        // from @shopify/graphql-codegen, which conflicts with the
        // overwritten type in src/preset.ts. This is a workaround.
        dts.replace('export type PresetConfig', 'type PresetConfig'),
      );
    },
  },
  {
    ...commonConfig,
    format: 'cjs',
    dts: false,
    entry: ['src/**/*.ts'],
    outDir: 'dist/cjs',
    plugins: [
      {
        // Replace .js with .cjs in require() calls:
        name: 'replace-require-extension',
        generateBundle(_, bundle) {
          for (const output of Object.values(bundle)) {
            if (output.type === 'chunk' && output.fileName.endsWith('.cjs')) {
              output.code = output.code.replace(/\.js(['"]\))/g, '.cjs$1');
            }
          }
        },
      },
    ],
  },
]);
