import {defineConfig} from 'vite';
import {unstable_vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    patchRemix(
      remix({
        buildDirectory: 'dist',
        serverBuildFile: 'index.js',
      }),
    ),
    tsconfigPaths(),
  ],
  server: {port: 3000, hmr: {port: 3001}},
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
  },
  resolve: {
    conditions: ['worker', 'workerd'],
  },
  ssr: {
    noExternal: true,
    target: 'webworker',
    optimizeDeps: {
      include: [
        'set-cookie-parser',
        'cookie',
        'content-security-policy-builder',
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/server',
        'react-dom/server.browser',
      ],
    },
  },
});

function patchRemix(plugins: ReturnType<typeof remix>) {
  const [remixPlugin] = plugins;
  const originalConfigureServer =
    typeof remixPlugin.configureServer === 'function'
      ? remixPlugin.configureServer
      : remixPlugin.configureServer?.handler!;

  remixPlugin.configureServer = (viteDevServer: any) => {
    // Prevent Remix from adding its own middleware to handle
    // requests in Node.js. We want to handle requests in workerd.
    viteDevServer.config.server.middlewareMode = true;
    return originalConfigureServer(viteDevServer);
  };

  return plugins;
}
