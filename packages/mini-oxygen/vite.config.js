import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/fixtures/**'],
  },
});
