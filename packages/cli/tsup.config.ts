import {defineConfig} from 'tsup';
import fs from 'fs-extra';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  dts: true,
  publicDir: 'templates',
  async onSuccess() {
    // These files need to be packaged/distributed with the CLI
    // so that we can use them in the `init` and `generate` commands.
    await fs.copy('../../templates', 'dist/templates', {
      filter: (filepath) => !/node_modules|\.cache|\.turbo/gi.test(filepath),
    });

    console.log('\n', 'Copied template files to build directory', '\n');
  },
});
