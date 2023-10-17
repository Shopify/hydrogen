import path from 'node:path';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsup';

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
    dts: true,
    entry: ['src/**/*.ts', 'src/patch.mts'],
    outDir: 'dist/esm',
    async onSuccess() {
      const schemaFile = 'dist/esm/schema.js';
      const content = await fs.readFile(schemaFile, 'utf8');
      // Uncomment createRequire for ESM:
      await fs.writeFile(schemaFile, content.replace(/\/\/!/g, ''));
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
