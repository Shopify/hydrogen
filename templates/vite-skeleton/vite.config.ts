import {defineConfig} from 'vite';
import {unstable_vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((options) => {
  const remixPlugins = remix({
    buildDirectory: 'dist',
    serverBuildFile: 'index.js',
  });

  const mainRemixPlugin = remixPlugins[0];
  const originalConfigureServer =
    typeof mainRemixPlugin.configureServer === 'function'
      ? mainRemixPlugin.configureServer
      : mainRemixPlugin.configureServer?.handler!;

  mainRemixPlugin.configureServer = (viteDevServer) => {
    viteDevServer.config.server.middlewareMode = true;
    return originalConfigureServer(viteDevServer);
  };

  const plugins = [remixPlugins, tsconfigPaths()];

  if (options.command === 'build' && !options.isSsrBuild) {
    return {
      plugins,
      ssr: {
        noExternal: true,
        target: 'webworker',
      },
    };
  }

  return {
    plugins,
    server: {
      port: 3000,
      hmr: {
        port: 3001,
      },
    },
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
  };
});
