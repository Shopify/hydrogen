import {defineConfig} from 'tsup';
import fs from 'fs-extra';

// Cleanup dist folder before buid/dev.
fs.removeSync('./dist');

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    outDir: 'dist',
    format: 'esm',
    minify: false,
    bundle: false,
    sourcemap: false,
    dts: true,
  },
]);
