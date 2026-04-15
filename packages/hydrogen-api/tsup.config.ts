import {defineConfig, Options} from 'tsup';

const sharedConfig: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  define: {__HYDROGEN_DEV__: 'false'},
};

export default defineConfig([
  {
    ...sharedConfig,
    dts: true,
    entry: ['src/index.ts'],
    tsconfig: 'tsconfig.json',
  },
]);
