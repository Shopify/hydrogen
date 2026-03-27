import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    pool: 'threads',
    include: ['src/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: ['@shopify/hydrogen-react', '@testing-library/react'],
      },
    },
  },
});
