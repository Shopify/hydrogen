import path from 'node:path';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsup';

const outDir = 'dist';
const cjsEntryContent = `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs');`;
const cjsEntryFile = path.resolve(process.cwd(), outDir, 'index.cjs');

const commonConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
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
    onSuccess: () => fs.writeFile(cjsEntryFile, cjsEntryContent, 'utf-8'),
  }),
];
