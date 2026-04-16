import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  hash: false,
  sourcemap: true,
  fixedExtension: false,
  define: {__HYDROGEN_DEV__: 'false'},
  copy: {
    from: [
      'src/storefront-api-types.d.ts',
      'src/customer-account-api-types.d.ts',
      'storefront.schema.json',
      'customer-account.schema.json',
    ],
    to: 'dist/generated',
  },
});
