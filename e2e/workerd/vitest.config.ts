import {defineConfig} from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 60000,
    root: path.dirname(new URL(import.meta.url).pathname),
    include: ['*.test.ts'],
  },
});
