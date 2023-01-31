import {defineConfig} from 'tsup';
import {file, output} from '@shopify/cli-kit';

const commonConfig = {
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  publicDir: 'templates',
  // The CLI is not imported anywhere so we don't need to generate types:
  dts: false,
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
    clean: true,
    outExtension: () => ({js: '.jsx'}),
    async onSuccess() {
      // Copy virtual-files
      await file.copy(
        'src/virtual-routes/assets',
        'dist/virtual-routes/assets',
      );

      // Copy the routes folder from the "skeleton" template
      // to the dist folder of the CLI package.
      // These files need to be packaged/distributed with the CLI
      // so that we can use them in the `generate` command.
      await file.copy('../../templates/skeleton/app/routes', 'dist/templates');

      output.newline();
      output.completed('Copied generator template files to build directory');
      output.newline();
    },
  },
]);
