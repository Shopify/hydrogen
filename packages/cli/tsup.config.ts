import {defineConfig} from 'tsup';
import fs from 'fs-extra';
import glob from 'fast-glob';

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

      console.log('\n');
      console.log('✅', 'Copied template files to build directory');

      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:
      await fs.copy('src/virtual-routes/assets', 'dist/virtual-routes/assets');

      console.log('✅', 'Copied virtual route assets to build directory');

      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:

      const guides = await glob('src/**/guide.md', {
        onlyFiles: true,
        absolute: true,
      });

      for (const guide of guides) {
        const guidePath = guide.replace('cli/src', 'cli/dist');
        await fs.copy(guide, guidePath);
      }

      console.log('✅', 'Copied upgrade guides to build directory', '\n');
    },
  },
]);
