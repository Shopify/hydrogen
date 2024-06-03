import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/create-app.ts'],
  outDir: 'dist',
  format: 'esm',
  outExtension: () => ({js: '.mjs'}),
  clean: true,
  bundle: true,
  minify: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  // 'react-devtools-core' is not used but breaks the build otherwise:
  external: ['react-devtools-core', '@ast-grep/napi', '@parcel/watcher'],
  noExternal: ['@shopify/cli-hydrogen'],
});
