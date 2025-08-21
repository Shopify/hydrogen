import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {defineConfig} from 'tsup';

const MAX_WAIT_MS = 10_000;
const INITIAL_DELAY_MS = 100;

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
    const cliAssetsPath = '../cli/dist/assets';

    // Wait for CLI assets with exponential backoff for reliability
    if (!existsSync(cliAssetsPath)) {
      await waitForPath(cliAssetsPath, MAX_WAIT_MS, INITIAL_DELAY_MS);
    }

    // Copy assets to the dist folder
    await fs.cp(cliAssetsPath, './dist/assets', {recursive: true});

    // This WASM file is used in a dependency, copy it over:
    await fs.copyFile(
      createRequire(import.meta.url).resolve('yoga-wasm-web/dist/yoga.wasm'),
      './dist/yoga.wasm',
    );
  },
});

/**
 * Wait for a path to actually exist with exponential backoff checking
 * across different machine speeds and build environments
 */
async function waitForPath(
  path: string,
  maxWaitMs = MAX_WAIT_MS,
  initialDelayMs = INITIAL_DELAY_MS,
) {
  if (!path) {
    console.warn('No path provided to waitForPath');
    return;
  }

  const startTime = Date.now();
  let delay = initialDelayMs;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    if (existsSync(path)) {
      // Found asset path
      return true;
    }

    if (attempts === 0) {
      console.log(`Waiting for ${path} to be created...`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Exponential backoff: start at 100ms, increase by 1.5x each time, cap at 2s
    // This gives us: 100ms, 150ms, 225ms, 337ms, 506ms, 759ms, 1138ms, 1707ms, 2000ms...
    delay = Math.min(delay * 1.5, 2000);
    attempts++;
  }

  throw new Error(
    `Timeout waiting for ${path} after ${maxWaitMs}ms (${attempts} attempts)`,
  );
}
