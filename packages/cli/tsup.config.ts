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
    entry: ['src/**/*.ts'],
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
    },
  },
  {
    format: 'esm',
    entry: ['src/virtual-routes/assets/dummy.ts'],
    outDir: 'dist/virtual-routes/assets',
    publicDir: 'src/virtual-routes/assets',
    dts: false,
  },
]);
