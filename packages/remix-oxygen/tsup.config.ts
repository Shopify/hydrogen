import path from 'node:path';
import {defineConfig} from 'tsup';

const outDir = 'dist';

const commonConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  treeshake: true,
  sourcemap: true,
});

export default [
  defineConfig({
    ...commonConfig,
    env: {NODE_ENV: 'development'},
    outDir: path.join(outDir, 'development'),
  }),
  defineConfig({
    ...commonConfig,
    env: {NODE_ENV: 'production'},
    dts: true,
    outDir: path.join(outDir, 'production'),
    minify: true,
  }),
];
