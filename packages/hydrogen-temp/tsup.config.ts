import {defineConfig, Options} from 'tsup';

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
  },
  {
    ...sharedConfig,
    entry: ['src/react/index.tsx'],
    outDir: 'dist/react',
    tsconfig: 'tsconfig.build.react.json',
    dts: true,
    external: ['react', 'react/jsx-runtime'],
  },
]);
