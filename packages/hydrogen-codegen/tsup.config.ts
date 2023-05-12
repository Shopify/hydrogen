import {defineConfig} from 'tsup';
import fs from 'fs/promises';

const commonConfig = {
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: true,
};

export default defineConfig([
  {
    ...commonConfig,
    format: 'esm',
    dts: true,
    entry: ['src/**/*.ts'],
    outDir: 'dist/esm',
    async onSuccess() {
      const schemaFile = 'dist/esm/schema.js';
      const content = await fs.readFile(schemaFile, 'utf8');
      // Uncomment createRequire for ESM:
      await fs.writeFile(schemaFile, content.replace(/\/\/!/g, ''));
    },
  },
  {
    ...commonConfig,
    format: 'cjs',
    dts: false,
    entry: ['src/**/*.ts'],
    outDir: 'dist/cjs',
  },
]);
