import path from 'node:path';
import {defineConfig} from 'tsup';
import fs from 'fs-extra';
import {execAsync} from './src/lib/process';
import {
  GENERATOR_TEMPLATES_DIR,
  GENERATOR_SETUP_ASSETS_DIR,
  GENERATOR_STARTER_DIR,
  getSkeletonSourceDir,
} from './src/lib/build';

// Cleanup dist folder before building
fs.removeSync('dist/generator-templates');
fs.removeSync('dist/virtual-routes');

const commonConfig = {
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  publicDir: 'templates',
  clean: false, // Avoid deleting the assets folder
  // Weird bug:
  // When `dts: true`, Tsup will remove all the d.ts files copied to `dist`
  // during `onSuccess` callbacks, thus removing part of the starter templates.
  dts: false,
};

const outDir = 'dist';

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts'],
    outDir,
    async onSuccess() {
      // Copy TS templates
      const i18nTemplatesPath = 'lib/setups/i18n/templates';
      await fs.copy(
        path.join('src', i18nTemplatesPath),
        path.join(outDir, i18nTemplatesPath),
      );
      console.log('\n', 'Copied i18n template files to build directory', '\n');

      console.log('\n', 'Generating Oclif manifest...');
      await execAsync('node ./scripts/generate-manifest.mjs');
      console.log('', 'Oclif manifest generated.\n');
    },
  },
  {
    ...commonConfig,
    entry: ['src/virtual-routes/**/*.tsx'],
    outDir: `${outDir}/virtual-routes`,
    outExtension: () => ({js: '.jsx'}),
    async onSuccess() {
      const filterArtifacts = (filepath: string) =>
        !/node_modules|\.shopify|\.cache|\.turbo|build|dist/gi.test(filepath);

      // These files need to be packaged/distributed with the CLI
      // so that we can use them in the `generate` command.
      await fs.copy(
        getSkeletonSourceDir(),
        `${outDir}/${GENERATOR_TEMPLATES_DIR}/${GENERATOR_STARTER_DIR}`,
        {filter: filterArtifacts},
      );

      console.log(
        '\n',
        'Copied skeleton template files to build directory',
        '\n',
      );

      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:
      await fs.copy(
        'src/virtual-routes/assets',
        `${outDir}/virtual-routes/assets`,
      );

      console.log('\n', 'Copied virtual route assets to build directory', '\n');

      await fs.copy(
        'src/setup-assets',
        `${outDir}/${GENERATOR_TEMPLATES_DIR}/${GENERATOR_SETUP_ASSETS_DIR}`,
      );

      console.log('\n', 'Copied setup assets build directory', '\n');
    },
  },
]);
