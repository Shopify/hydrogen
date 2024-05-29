import path from 'node:path';
import {defineConfig} from 'tsup';
import fs from 'fs-extra';
import {execAsync} from './src/lib/process';
import {
  ASSETS_DIR_PREFIX,
  ASSETS_STARTER_DIR,
  getSkeletonSourceDir,
} from './src/lib/build';

// Cleanup dist folder before buid/dev.
fs.removeSync('./dist');

const commonConfig = defineConfig({
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  clean: false, // Avoid deleting the assets folder
});

const outDir = 'dist';

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    outDir,
    // Generate types only for the exposed entry points
    dts: {entry: ['src/index.ts', 'src/commands/hydrogen/init.ts']},
    async onSuccess() {
      // Copy assets templates
      await fs.copy(
        path.resolve('assets'),
        path.join(outDir, ASSETS_DIR_PREFIX),
      );

      // These files need to be packaged/distributed with the CLI
      // so that we can use them in the `generate` command.
      await fs.copy(
        getSkeletonSourceDir(),
        `${outDir}/${ASSETS_DIR_PREFIX}/${ASSETS_STARTER_DIR}`,
        {
          filter: (filepath: string) =>
            !/node_modules|\.shopify|\.cache|\.turbo|build|dist/gi.test(
              filepath,
            ),
        },
      );

      console.log(
        '\n',
        'Copied skeleton template files to build directory',
        '\n',
      );

      // Copy TS templates
      const i18nTemplatesPath = 'lib/setups/i18n/templates';
      await fs.copy(
        path.join('src', i18nTemplatesPath),
        path.join(outDir, i18nTemplatesPath),
      );
      console.log('\n', 'Copied i18n template files to build directory', '\n');

      // Copy Route Templates
      const routeTemplatesPath = 'lib/setups/routes/templates';
      await fs.copy(
        path.join('src', routeTemplatesPath),
        path.join(outDir, routeTemplatesPath),
      );
      console.log('\n', 'Copied route template files to build directory', '\n');

      // Copy Bundle Analyzer
      const bundleAnalyzer = 'lib/bundle/bundle-analyzer.html';
      await fs.copy(
        path.join('src', bundleAnalyzer),
        path.join(outDir, bundleAnalyzer),
      );
      console.log('\n', 'Copied bundle analyzer', '\n');

      console.log('\n', 'Generating Oclif manifest...');
      await execAsync('node ./scripts/generate-manifest.mjs');
      console.log('', 'Oclif manifest generated.\n');
    },
  },
  {
    ...commonConfig,
    // TODO remove virtual routes copy when deprecating classic compiler
    entry: ['../hydrogen/src/vite/virtual-routes/**/*.tsx'],
    outDir: `${outDir}/lib/virtual-routes`,
    outExtension: () => ({js: '.jsx'}),
    dts: false,
    async onSuccess() {
      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:
      await fs.copy(
        '../hydrogen/src/vite/virtual-routes/assets',
        `${outDir}/lib/virtual-routes/assets`,
      );

      console.log('\n', 'Copied virtual route assets to build directory', '\n');
    },
  },
]);
