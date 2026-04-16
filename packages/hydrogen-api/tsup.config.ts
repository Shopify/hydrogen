import {defineConfig, Options} from 'tsup';
import fs from 'node:fs/promises';
import path from 'node:path';

const sharedConfig: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  define: {__HYDROGEN_DEV__: 'false'},
};

const COPY_TO_DIST_PATHS = [
  'src/storefront-api-types.d.ts',
  'src/customer-account-api-types.d.ts',
  'storefront.schema.json',
  'customer-account.schema.json',
];

export default defineConfig([
  {
    ...sharedConfig,

    entry: ['src/index.ts'],
    tsconfig: 'tsconfig.json',
    onSuccess: async () => {
      console.log(`Copying ${COPY_TO_DIST_PATHS.length} assets to dist folder`);
      await Promise.all(
        COPY_TO_DIST_PATHS.map(async (filePath) => {
          const filename = path.basename(filePath);
          // create the generated folder if it doesn't exist
          await fs.mkdir('dist/generated', {recursive: true});
          await fs.copyFile(filePath, `dist/generated/${filename}`);
        }),
      );
      console.log('Assets copied to dist');
    },
  },
]);
