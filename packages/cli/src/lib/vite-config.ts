import {joinPath} from '@shopify/cli-kit/node/path';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';

export async function getViteConfig(root: string) {
  const vite = await import('vite');

  const command = 'build';
  const mode = process.env.NODE_ENV || 'production';

  const maybeConfig = await vite.loadConfigFromFile(
    {command, mode, isSsrBuild: true},
    undefined,
    root,
  );

  if (!maybeConfig || !maybeConfig.path) {
    throw new Error('No Vite config found');
  }

  const resolvedViteConfig = await vite.resolveConfig(
    {root, build: {ssr: true}},
    command,
    mode,
    mode,
  );

  const serverOutDir = resolvedViteConfig.build.outDir;
  const clientOutDir = serverOutDir.replace(/server$/, 'client');

  const rollupOutput = resolvedViteConfig.build.rollupOptions.output;
  const {entryFileNames} =
    (Array.isArray(rollupOutput) ? rollupOutput[0] : rollupOutput) ?? {};
  const serverOutFile = joinPath(
    serverOutDir,
    typeof entryFileNames === 'string' ? entryFileNames : 'index.js',
  );

  return {
    clientOutDir,
    serverOutDir,
    serverOutFile,
    resolvedViteConfig,
    userViteConfig: maybeConfig.config,
    remixConfig: getRemixConfigFromVite(resolvedViteConfig),
  };
}

function getRemixConfigFromVite(viteConfig: any) {
  const {remixConfig} =
    (viteConfig.__remixPluginContext as RemixPluginContext) || {
      remixConfig: {appDirectory: joinPath(viteConfig.root, 'app')},
    };

  return remixConfig;
}
