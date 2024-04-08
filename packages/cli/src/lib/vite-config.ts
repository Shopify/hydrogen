import {
  basename,
  dirname,
  joinPath,
  resolvePath,
} from '@shopify/cli-kit/node/path';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';
import {findFileWithExtension} from './file.js';

// Do not import JS from here, only types
import type {HydrogenPlugin} from '~/hydrogen/vite/plugin.js';
import type {OxygenPlugin} from '~/mini-oxygen/vite/plugin.js';

export async function hasViteConfig(root: string) {
  const result = await findFileWithExtension(root, 'vite.config');
  return !!result.filepath;
}

export async function getViteConfig(root: string, ssrEntryFlag?: string) {
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

  const ssrEntry = ssrEntryFlag ?? resolvedViteConfig.build.ssr;
  const {...remixPluginConfig} = getRemixConfigFromVite(resolvedViteConfig);

  const resolvedSsrEntry = resolvePath(
    resolvedViteConfig.root,
    typeof ssrEntry === 'string' ? ssrEntry : 'server',
  );

  return {
    clientOutDir,
    serverOutDir,
    serverOutFile,
    resolvedViteConfig,
    userViteConfig: maybeConfig.config,
    remixConfig: {
      ...remixPluginConfig,
      rootDirectory: resolvedViteConfig.root,
      serverEntryPoint:
        (
          await findFileWithExtension(
            dirname(resolvedSsrEntry),
            basename(resolvedSsrEntry),
          )
        ).filepath || resolvedSsrEntry,
    },
  };
}

function getRemixConfigFromVite(viteConfig: any) {
  const {remixConfig} =
    (viteConfig.__remixPluginContext as RemixPluginContext) || {
      remixConfig: {appDirectory: joinPath(viteConfig.root, 'app')},
    };

  type RemixPluginConfig = typeof remixConfig;

  // Remove these types because they create TS problems.
  return remixConfig as Omit<RemixPluginConfig, 'future' | 'buildEnd'>;
}

type MinimalViteConfig = {plugins: Readonly<Array<{name: string}>>};

function findPlugin<
  PluginType extends Config['plugins'][number],
  Config extends MinimalViteConfig = MinimalViteConfig,
>(config: Config, name: string) {
  return config.plugins.find((plugin) => plugin.name === name) as
    | PluginType
    | undefined;
}

export function findHydrogenPlugin<Config extends MinimalViteConfig>(
  config: Config,
) {
  return findPlugin<HydrogenPlugin>(config, 'hydrogen:main');
}
export function findOxygenPlugin<Config extends MinimalViteConfig>(
  config: Config,
) {
  return findPlugin<OxygenPlugin>(config, 'oxygen:main');
}
