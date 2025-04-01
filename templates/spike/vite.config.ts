import {reactRouter} from '@react-router/dev/vite';
import {cloudflare} from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    cloudflare({viteEnvironment: {name: 'ssr'}}),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
