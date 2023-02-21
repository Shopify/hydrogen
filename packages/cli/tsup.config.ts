import {defineConfig} from 'tsup';
import fs from 'fs-extra';

const commonConfig = {
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  dts: true,
  publicDir: 'templates',
};

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts', '!src/virtual-routes/**/*'],
    outDir: 'dist',
  },
  {
    ...commonConfig,
    entry: ['src/virtual-routes/**/*.tsx'],
    outDir: 'dist/virtual-routes',
    clean: false, // Avoid deleting the assets folder
    dts: false,
    outExtension: () => ({js: '.jsx'}),
    async onSuccess() {
      // These files need to be packaged/distributed with the CLI
      // so that we can use them in the `generate` command.
      await fs.copy(
        '../../templates/skeleton/app/routes',
        'dist/generator-templates/routes',
        {
          filter: (filepath) =>
            !/node_modules|\.cache|\.turbo|build|dist/gi.test(filepath),
        },
      );

      console.log('\n', 'Copied template files to build directory', '\n');

      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:
      await fs.copy('src/virtual-routes/assets', 'dist/virtual-routes/assets');

      console.log('\n', 'Copied virtual route assets to build directory', '\n');
    },
  },
  {
    format: 'cjs',
    entry: ['src/h2.cts'],
    outDir: 'dist',
    dts: false,
  },
]);
