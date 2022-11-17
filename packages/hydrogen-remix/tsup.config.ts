import {defineConfig} from 'tsup';
import fs from 'fs/promises';

const entry = 'src/index.ts';

const common = defineConfig({
  entryPoints: [entry],
  format: ['esm', 'cjs'],
  treeshake: true,
  clean: true,
  sourcemap: true,
});

export default defineConfig([
  {
    ...common,
    env: {NODE_ENV: 'production'},
    dts: entry,
    outDir: 'dist/production',
    minify: true,
    async onSuccess() {
      await fs.writeFile(
        './dist/index.cjs',
        `module.exports = process.env.NODE_ENV === 'development' ? require('./development/index.cjs') : require('./production/index.cjs);`,
        'utf-8',
      );
    },
  },
  {
    ...common,
    env: {NODE_ENV: 'development'},
    outDir: 'dist/development',
  },
]);
