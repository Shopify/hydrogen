import {rmSync} from 'node:fs';
import {defineConfig} from 'tsup';

// Cleanup dist folder before buid/dev.
rmSync('./dist', {recursive: true, force: true});

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/vite/worker-entry.ts'],
    outDir: 'dist',
    format: 'esm',
    minify: false,
    bundle: false,
    sourcemap: false,
    dts: true,
  },
  {
    entry: ['src/vite/worker-entry.ts'],
    outDir: 'dist/vite',
    format: 'esm',
    noExternal: [/./],
    dts: false,
  },
]);
