import path from 'node:path';
import {rmSync} from 'node:fs';
import {cp as copy} from 'node:fs/promises';
import {defineConfig} from 'tsdown';
import {execAsync} from './src/lib/process';
import {
  ASSETS_DIR_PREFIX,
  ASSETS_STARTER_DIR,
  getSkeletonSourceDir,
} from './src/lib/build';
import {replaceWorkspaceProtocolVersions} from './src/lib/template-pack';

// Cleanup dist folder before buid/dev.
rmSync('./dist', {recursive: true, force: true});

const commonConfig = defineConfig({
  format: 'esm',
  minify: false,
  unbundle: true,
  treeshake: true,
  sourcemap: false,
  fixedExtension: false,
  clean: false, // Avoid deleting the assets folder
  deps: {
    skipNodeModulesBundle: true,
  },
});

const outDir = 'dist';

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    outDir,
    dts: false,
    async onSuccess() {
      // Copy assets templates
      await copy(path.resolve('assets'), path.join(outDir, ASSETS_DIR_PREFIX), {
        recursive: true,
        force: true,
      });

      // These files need to be packaged/distributed with the CLI
      // so that we can use them in the `generate` command.
      const starterOutDir = path.join(
        outDir,
        ASSETS_DIR_PREFIX,
        ASSETS_STARTER_DIR,
      );

      await copy(getSkeletonSourceDir(), starterOutDir, {
        force: true,
        recursive: true,
        filter: (filepath: string) =>
          !/node_modules|\.shopify|\.cache|\.turbo|build|dist/gi.test(filepath),
      });
      await replaceWorkspaceProtocolVersions({
        sourceTemplateDir: getSkeletonSourceDir(),
        targetTemplateDir: starterOutDir,
      });

      console.log(
        '\n',
        'Copied skeleton template files to build directory',
        '\n',
      );

      console.log('\n', 'Generating Oclif manifest...');
      await execAsync('node ./scripts/generate-manifest.mjs');
      console.log('', 'Oclif manifest generated.\n');
    },
  },
  {
    ...commonConfig,
    entry: ['src/index.ts', 'src/commands/hydrogen/init.ts'],
    outDir,
    // Generate types only for the exposed entry points
    dts: {emitDtsOnly: true},
    outExtensions: () => ({dts: '.d.ts'}),
  },
  {
    ...commonConfig,
    // TODO remove virtual routes copy when deprecating classic compiler
    entry: ['../hydrogen/src/vite/virtual-routes/**/*.tsx'],
    outDir: `${outDir}/${ASSETS_DIR_PREFIX}/virtual-routes`,
    outExtensions: () => ({js: '.jsx'}),
    dts: false,
    treeshake: false,
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: [
        /^@shopify\/hydrogen(?:-react)?(?:\/.*)?$/,
        /^react(?:-router)?(?:\/.*)?$/,
        /\.(css|svg|woff2)(\?.*)?$/,
      ],
    },
    async onSuccess() {
      // For some reason, it seems that publicDir => outDir might be skipped on CI,
      // so ensure here that asset files are copied:
      await copy(
        '../hydrogen/src/vite/virtual-routes/assets',
        `${outDir}/${ASSETS_DIR_PREFIX}/virtual-routes/assets`,
        {recursive: true, force: true},
      );

      console.log('\n', 'Copied virtual route assets to build directory', '\n');
    },
  },
]);
