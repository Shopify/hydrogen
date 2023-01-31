import {defineConfig} from 'tsup';
import fs from 'fs-extra';

const commonConfig = {
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  // The CLI is not imported anywhere so we don't need to generate types:
  dts: false,
};

export default defineConfig([
  {
    ...commonConfig,
    entry: ['src/**/*.ts'],
    outDir: 'dist',
  },
  {
    ...commonConfig,
    entry: ['src/virtual-routes/**/*.tsx'],
    outDir: 'dist/virtual-routes',
    clean: true,
    outExtension: () => ({js: '.jsx'}),
    async onSuccess() {
      await fs.copy('src/virtual-routes/assets', 'dist/virtual-routes/assets');
    },
  },
]);
