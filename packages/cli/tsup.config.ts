import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  // The CLI is not imported anywhere so we don't need to generate types:
  dts: false,
});
