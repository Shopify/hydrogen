import {rmSync} from 'node:fs';
import {defineConfig} from 'tsdown';

// Cleanup dist folder before buid/dev.
rmSync('./dist', {recursive: true, force: true});

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/vite/worker-entry.ts'],
    outDir: 'dist',
    format: 'esm',
    minify: false,
    unbundle: true,
    sourcemap: false,
    dts: true,
    fixedExtension: false,
    outExtensions: () => ({dts: '.d.ts'}),
    deps: {
      skipNodeModulesBundle: true,
    },
  },
  {
    entry: ['src/vite/worker-entry.ts'],
    outDir: 'dist/vite',
    format: 'esm',
    fixedExtension: false,
    deps: {
      alwaysBundle: [/./],
    },
    dts: false,
  },
]);
