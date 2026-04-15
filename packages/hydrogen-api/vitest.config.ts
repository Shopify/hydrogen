import {defineConfig} from 'vitest/config';

export default defineConfig({
  define: {
    __HYDROGEN_DEV__: true,
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
