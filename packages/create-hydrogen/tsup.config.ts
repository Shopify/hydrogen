import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/create-app.ts'],
  outDir: 'dist',
  format: 'esm',
  clean: true,
  sourcemap: false,
  dts: false,
  minify: true,
  splitting: true, // Async/await breaks without splitting

  // -- Bundle:
  bundle: true,
  external: [
    '@ast-grep/napi', // Required binary
    'react-devtools-core', // Not used but breaks the build otherwise
  ],
  // Needed for some CJS dependencies:
  shims: true,
  banner: {
    js: "import { createRequire as __createRequire } from 'module';globalThis.require = __createRequire(import.meta.url);",
  },
  async onSuccess() {
    // Copy assets to the dist folder
    await fs.cp('../cli/dist/assets', './dist/assets', {recursive: true});

    // This WASM file is used in a dependency, copy it over:
    await fs.copyFile(
      createRequire(import.meta.url).resolve('yoga-wasm-web/dist/yoga.wasm'),
      './dist/yoga.wasm',
    );
  },
});
