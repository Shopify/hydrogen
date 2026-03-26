import {defineConfig, Options} from 'tsup';
import {copyFile} from 'node:fs/promises';
import path from 'node:path';
import pkg from './package.json';

const sharedConfig: Options = {
  splitting: false,
  sourcemap: true,
  // clean: false because tsup array configs run concurrently — clean on one
  // entry would delete the other entry's output. The build script uses
  // `rimraf dist` to clean before tsup runs instead.
  clean: false,
  format: ['esm'],
  define: {
    __HYDROGEN_DEV__: 'false',
    __PACKAGE_NAME__: JSON.stringify(pkg.name),
  },
};

export default defineConfig([
  {
    ...sharedConfig,
    entry: ['src/core/index.ts'],
    tsconfig: 'tsconfig.build.json',
    dts: {
      resolve: ['@shopify/hydrogen-codegen'],
    },
    onSuccess: async () => {
      const sfTypeFile = 'storefront-api-types.d.ts';
      await copyFile(
        path.resolve('src', 'core', sfTypeFile),
        path.resolve('dist', sfTypeFile),
      );
      console.log('\n', 'Storefront API types copied to dist/', '\n');
    },
  },
  {
    ...sharedConfig,
    entry: ['src/react/index.tsx'],
    outDir: 'dist/react',
    tsconfig: 'tsconfig.build.react.json',
    dts: true,
    external: ['react', 'react/jsx-runtime'],
  },
  {
    ...sharedConfig,
    entry: ['src/codegen/index.ts'],
    outDir: 'dist/codegen',
    tsconfig: 'src/codegen/tsconfig.json',
    dts: {
      resolve: ['@shopify/hydrogen-codegen'],
    },
    external: ['@shopify/graphql-codegen', '@graphql-codegen/plugin-helpers'],
    // ESM has no `require` — getSchema() needs require.resolve() to locate
    // the storefront schema JSON via Node's module resolution. This banner
    // injects a CJS-compatible `require` at the top of the built ESM file.
    banner: {
      js: "import {createRequire} from 'module'; const require = createRequire(import.meta.url);",
    },
  },
]);
