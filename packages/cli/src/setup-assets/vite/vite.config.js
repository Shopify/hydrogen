import {defineConfig} from 'vite';
import {hydrogen, oxygen} from '@shopify/cli-hydrogen/experimental-vite';
import {unstable_vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      buildDirectory: 'dist',
      // @ts-ignore This is fixed in the next Remix version
      publicPath: process.env.HYDROGEN_ASSET_BASE_URL,
    }),
    tsconfigPaths(),
  ],
});
