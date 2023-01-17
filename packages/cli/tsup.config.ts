import {defineConfig} from 'tsup';
import {file, output} from '@shopify/cli-kit';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  publicDir: 'templates',
  // The CLI is not imported anywhere so we don't need to generate types:
  dts: false,
  async onSuccess() {
    // Copy the routes folder from the "skeleton" template
    // to the dist folder of the CLI package.
    // These files need to be packaged/distributed with the CLI
    // so that we can use them in the `generate` command.
    await file.copy('../../templates/skeleton/app/routes', 'dist/templates');

    output.newline();
    output.completed('Copied generator template files to build directory');
    output.newline();
  },
});
