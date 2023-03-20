import {defineConfig} from 'tsup';

const commonConfig = {
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: true,
};

export default defineConfig([
  {
    ...commonConfig,
    format: 'esm',
    dts: true,
    entry: ['src/**/*.ts'],
    outDir: 'dist/esm',
  },
  {
    ...commonConfig,
    format: 'cjs',
    dts: false,
    entry: ['src/**/*.ts'],
    outDir: 'dist/cjs',
  },
]);
