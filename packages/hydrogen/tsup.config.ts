import path from 'node:path';
import fs from 'node:fs/promises';
import {defineConfig} from 'tsup';

const outDir = 'dist';
const cjsEntryContent = `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs');`;
const cjsEntryFile = path.resolve(process.cwd(), outDir, 'index.cjs');

const commonConfig = defineConfig({
  entry: ['src/index.ts', 'src/debug.ts'],
  format: ['esm', 'cjs'],
  treeshake: true,
  sourcemap: true,
});

export default [
  defineConfig({
    ...commonConfig,
    env: {NODE_ENV: 'development'},
    outDir: path.join(outDir, 'development'),
  }),
  defineConfig({
    ...commonConfig,
    env: {NODE_ENV: 'production'},
    dts: true,
    outDir: path.join(outDir, 'production'),
    minify: true,
    onSuccess: async () => {
      await fs.writeFile(cjsEntryFile, cjsEntryContent, 'utf-8');

      const hydrogenReact = path.resolve('..', 'hydrogen-react');
      const schemaFile = 'storefront.schema.json';
      const typeFile = 'storefront-api-types.d.ts';

      await fs.copyFile(
        path.resolve(hydrogenReact, schemaFile),
        path.resolve(outDir, schemaFile),
      );
      await fs.copyFile(
        path.resolve(hydrogenReact, 'src', typeFile),
        path.resolve(outDir, typeFile),
      );

      console.log('\n', 'SFAPI types copied from hydrogen-react', '\n');
    },
  }),
];
