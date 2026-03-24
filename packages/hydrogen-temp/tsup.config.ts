import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/core/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  dts: {
    resolve: ['@shopify/hydrogen-codegen'],
  },
  format: ['esm'],
  define: {
    __HYDROGEN_DEV__: 'false',
  },
});
