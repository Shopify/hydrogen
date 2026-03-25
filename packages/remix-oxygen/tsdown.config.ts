import path from 'node:path';
import {rmSync} from 'node:fs';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsdown';

const outDir = 'dist';
const cjsEntryContent = `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs');`;
const cjsEntryFile = path.resolve(process.cwd(), outDir, 'index.cjs');

// Cleanup dist folder before build/dev.
rmSync('./dist', {recursive: true, force: true});

const dtsOutExtensions = () => ({dts: '.d.ts'});

const commonConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  treeshake: true,
  sourcemap: true,
  dts: false,
  fixedExtension: false,
  clean: false,
  deps: {
    skipNodeModulesBundle: true,
  },
});

export default defineConfig([
  {
    ...commonConfig,
    env: {NODE_ENV: 'development'},
    outDir: path.join(outDir, 'development'),
  },
  {
    ...commonConfig,
    env: {NODE_ENV: 'production'},
    dts: false,
    outDir: path.join(outDir, 'production'),
    minify: true,
    onSuccess: () => fs.writeFile(cjsEntryFile, cjsEntryContent, 'utf-8'),
  },
  {
    entry: ['src/index.ts'],
    outDir: path.join(outDir, 'production'),
    format: 'esm',
    sourcemap: false,
    dts: {emitDtsOnly: true},
    fixedExtension: false,
    outExtensions: dtsOutExtensions,
    clean: false,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
]);
