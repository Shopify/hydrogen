import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'happy-dom',
  },
  define: {
    __HYDROGEN_DEV__: true,
    __HYDROGEN_TEST__: true,
  },
});
