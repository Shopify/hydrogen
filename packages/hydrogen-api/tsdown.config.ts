import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  hash: false,
  sourcemap: true,
  inputOptions: {
    transform: {define: {__HYDROGEN_DEV__: 'false'}},
  },
  copy: [
    {
      from: 'src/storefront-api-types.d.ts',
      to: 'dist/generated/storefront-api-types.d.ts',
    },
    {
      from: 'src/customer-account-api-types.d.ts',
      to: 'dist/generated/customer-account-api-types.d.ts',
    },
    {
      from: 'storefront.schema.json',
      to: 'dist/generated/storefront.schema.json',
    },
    {
      from: 'customer-account.schema.json',
      to: 'dist/generated/customer-account.schema.json',
    },
  ],
});
