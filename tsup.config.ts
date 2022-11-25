import {defineConfig} from 'tsup';
import fs from 'fs/promises';
import path from 'path';

export const entry = 'src/index.ts';
export const outDir = 'dist';
export const cjsEntryContent = `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs');`;
export const cjsEntryFile = path.resolve(process.cwd(), outDir, 'index.cjs');

const common = defineConfig({
  entryPoints: [entry],
  format: ['esm', 'cjs'],
  treeshake: true,
  sourcemap: true,
});

export const devConfig = defineConfig({
  ...common,
  env: {NODE_ENV: 'development'},
  outDir: path.join(outDir, 'development'),
});

export const prodConfig = defineConfig({
  ...common,
  env: {NODE_ENV: 'production'},
  dts: entry,
  outDir: path.join(outDir, 'production'),
  minify: true,
  onSuccess: () => fs.writeFile(cjsEntryFile, cjsEntryContent, 'utf-8'),
});

export default [devConfig, prodConfig];
