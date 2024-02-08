import {joinPath} from '@shopify/cli-kit/node/path';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';

export async function getViteConfig(root: string) {
  const vite = await import('vite');

  const viteConfig = await vite.resolveConfig(
    {root, build: {ssr: true}},
    'build',
    process.env.NODE_ENV,
    process.env.NODE_ENV,
  );

  if (!viteConfig.configFile) throw new Error('No Vite config found');

  const serverOutDir = viteConfig.build.outDir;
  const clientOutDir = serverOutDir.replace(/server$/, 'client');

  const rollupOutput = viteConfig.build.rollupOptions.output;
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
    viteConfig,
    remixConfig: getRemixConfigFromVite(viteConfig),
  };
}

function getRemixConfigFromVite(viteConfig: any) {
  const {remixConfig} =
    (viteConfig.__remixPluginContext as RemixPluginContext) || {
      remixConfig: {appDirectory: joinPath(viteConfig.root, 'app')},
    };

  return remixConfig;
}
