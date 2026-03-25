import path from 'node:path';
import {rmSync} from 'node:fs';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsdown';

const outDir = 'dist';
const cjsEntryContent = `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs');`;
const cjsEntryFile = path.resolve(process.cwd(), outDir, 'index.cjs');

// Cleanup dist folder before build/dev.
rmSync('./dist', {recursive: true, force: true});

const dtsOutExtensions = () => ({dts: '.d.ts'});

const commonConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  treeshake: true,
  sourcemap: true,
  dts: false,
  fixedExtension: false,
  clean: false,
  deps: {
    skipNodeModulesBundle: true,
  },
});

export default defineConfig([
  {
    ...commonConfig,
    env: {NODE_ENV: 'development'},
    outDir: path.join(outDir, 'development'),
  },
  {
    ...commonConfig,
    env: {NODE_ENV: 'production'},
    dts: false,
    outDir: path.join(outDir, 'production'),
    minify: true,
    onSuccess: async () => {
      await fs.writeFile(cjsEntryFile, cjsEntryContent, 'utf-8');

      const hydrogenReact = path.resolve('..', 'hydrogen-react');
      const sfSchemaFile = 'storefront.schema.json';
      const sfTypeFile = 'storefront-api-types.d.ts';

      await fs.copyFile(
        path.resolve(hydrogenReact, sfSchemaFile),
        path.resolve(outDir, sfSchemaFile),
      );
      await fs.copyFile(
        path.resolve(hydrogenReact, 'src', sfTypeFile),
        path.resolve(outDir, sfTypeFile),
      );

      console.log(
        '\n',
        'Storefront API types copied from hydrogen-react',
        '\n',
      );

      const caSchemaFile = 'customer-account.schema.json';
      const caTypeFile = 'customer-account-api-types.d.ts';

      await fs.copyFile(
        path.resolve(hydrogenReact, caSchemaFile),
        path.resolve(outDir, caSchemaFile),
      );
      await fs.copyFile(
        path.resolve(hydrogenReact, 'src', caTypeFile),
        path.resolve(outDir, caTypeFile),
      );

      console.log('\n', 'Customer API types copied from hydrogen-react', '\n');

      // Copy React Router augmentation types with corrected import path
      const reactRouterSource = await fs.readFile('react-router.d.ts', 'utf-8');
      const reactRouterDist = reactRouterSource.replace(
        './src/index',
        './production/index',
      );
      await fs.writeFile(
        path.resolve(outDir, 'react-router.d.ts'),
        reactRouterDist,
        'utf-8',
      );

      console.log('\n', 'React Router augmentation types copied', '\n');
    },
  },
  {
    entry: ['src/index.ts'],
    outDir: path.join(outDir, 'production'),
    format: 'esm',
    sourcemap: false,
    dts: {emitDtsOnly: true},
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
  {
    entry: [
      'src/vite/**/*.ts',
      '!src/vite/**/*.test.ts',
      '!src/vite/virtual-routes/**/*',
    ],
    outDir: 'dist/vite',
    format: 'esm',
    minify: false,
    sourcemap: false,
    dts: true,
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
  {
    entry: ['src/dev/**/*.ts', '!src/dev/**/*.test.ts'],
    outDir: 'dist/dev',
    format: 'esm',
    minify: false,
    sourcemap: false,
    dts: true,
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
  {
    entry: ['src/oxygen/**/*.ts', '!src/oxygen/**/*.test.ts'],
    outDir: 'dist/oxygen',
    format: 'esm',
    minify: false,
    sourcemap: false,
    dts: true,
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
  {
    entry: ['src/vite/virtual-routes/**/*.tsx'],
    outDir: `${outDir}/vite/virtual-routes`,
    outExtensions: () => ({js: '.jsx'}),
    format: 'esm',
    minify: false,
    unbundle: true,
    treeshake: false,
    sourcemap: false,
    dts: false,
    clean: false, // Avoid deleting the assets folder
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: [
        /^@shopify\/hydrogen(?:-react)?(?:\/.*)?$/,
        /^react(?:-router)?(?:\/.*)?$/,
        /\.(css|svg|woff2)(\?.*)?$/,
      ],
    },
    async onSuccess() {
      await fs.cp(
        'src/vite/virtual-routes/assets',
        `${outDir}/vite/virtual-routes/assets`,
        {recursive: true},
      );

      // Copy the Chrome DevTools route TypeScript file for React Router
      await fs.cp(
        'src/vite/virtual-routes/routes/[.]well-known.appspecific.com[.]chrome[.]devtools[.]json.tsx',
        `${outDir}/vite/virtual-routes/routes/[.]well-known.appspecific.com[.]chrome[.]devtools[.]json.tsx`,
      );

      console.log('\n', 'Copied virtual route assets to build directory', '\n');
    },
  },
  {
    entry: ['src/react-router-preset.ts'],
    outDir: 'dist/production',
    format: 'esm',
    minify: true,
    sourcemap: false,
    dts: true,
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: ['@react-router/dev/config'],
    },
  },
  {
    entry: ['src/react-router-preset.ts'],
    outDir: 'dist/development',
    format: 'esm',
    minify: false,
    sourcemap: true,
    dts: true,
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: ['@react-router/dev/config'],
    },
  },
]);
