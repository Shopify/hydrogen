import {defineConfig} from 'tsup';
import {createRequire} from 'module';
import fs from 'fs/promises';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'cjs',
  minify: false,
  bundle: false,
  sourcemap: false,
  dts: false,
});
