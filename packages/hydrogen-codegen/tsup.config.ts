import path from 'node:path';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsup';
import {generateDtsBundle} from 'dts-bundle-generator';

const commonConfig = {
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: true,
};

export default defineConfig([
  {
    ...commonConfig,
    format: 'esm',
    entry: ['src/**/*.ts'],
    outDir: 'dist/esm',
    // TSUP does not bundle types properly for this package,
    // use dts-bundle-generator instead.
    dts: false,
    async onSuccess() {
      const schemaFile = 'dist/esm/schema.js';
      const content = await fs.readFile(schemaFile, 'utf8');
      // Uncomment createRequire for ESM:
      await fs.writeFile(schemaFile, content.replace(/\/\/!/g, ''));

      const [dts] = await generateDtsBundle([
        {
          filePath: './src/index.ts',
          libraries: {inlinedLibraries: ['@shopify/graphql-codegen']},
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
        async buildEnd({writtenFiles}) {
          await Promise.all(
            writtenFiles
              .filter(({name}) => name.endsWith('.cjs'))
              .map(async ({name}) => {
                const filepath = path.resolve('.', name);
                const contents = await fs.readFile(filepath, 'utf8');

                await fs.writeFile(
                  filepath,
                  contents.replace(/\.js'\);/g, ".cjs');"),
                );
              }),
          );
        },
      },
    ],
  },
]);
