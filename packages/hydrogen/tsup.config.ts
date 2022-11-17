import {defineConfig} from 'tsup';

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
  },
  {
    ...common,
    env: {NODE_ENV: 'development'},
    outDir: 'dist/development',
  },
]);
