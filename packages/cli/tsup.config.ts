import {defineConfig} from 'tsup';

const commonConfig = {
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  // The CLI is not imported anywhere so we don't need to generate types:
  dts: false,
};

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts'],
    outDir: 'dist',
  },
  {
    ...commonConfig,
    entry: ['src/shadow-routes/**/*.tsx'],
    outDir: 'dist/shadow-routes',
    clean: true,
    outExtension: () => ({js: '.jsx'}),
  },
]);
