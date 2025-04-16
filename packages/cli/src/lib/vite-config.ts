import {
  basename,
  dirname,
  joinPath,
  resolvePath,
} from '@shopify/cli-kit/node/path';
import {findFileWithExtension} from './file.js';
import {importVite} from './import-utils.js';

// Do not import JS from here, only types
import type {HydrogenPlugin} from '~/hydrogen/vite/plugin.js';
import type {OxygenPlugin} from '~/mini-oxygen/vite/plugin.js';
import {
  hasRemixConfigFile,
  ResolvedRRConfig,
  ResolvedRoutes,
} from './remix-config.js';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import type {ResolvedConfig, UserConfig} from 'vite';

export async function hasViteConfig(root: string) {
  const result = await findFileWithExtension(root, 'vite.config');
  return !!result.filepath;
}

export async function isViteProject(root: string) {
  const isVite = await hasViteConfig(root);

  if (isVite && (await hasRemixConfigFile(root))) {
    renderWarning({
      headline: 'Both Vite and Remix config files found.',
      body: 'The remix.config.js file is not used in Vite projects. Please remove it to avoid conflicts.',
    });
  }

  return isVite;
}

type ViteConfigResult = {
  clientOutDir: string;
  serverOutDir: string;
  serverOutFile: string;
  resolvedViteConfig: ResolvedConfig;
  userViteConfig: UserConfig;
  remixConfig: ResolvedRRConfig;
};

export async function getViteConfig(
  root: string,
  ssrEntryFlag?: string,
): Promise<ViteConfigResult> {
  const vite = await importVite(root);

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

  const {appDirectory, serverBuildFile, routes} =
    getRemixConfigFromVite(resolvedViteConfig);

  const serverOutDir = resolvedViteConfig.build.outDir;
  const clientOutDir = serverOutDir.replace(/server$/, 'client');

  const rollupOutput = resolvedViteConfig.build.rollupOptions.output;
  const {entryFileNames} =
    (Array.isArray(rollupOutput) ? rollupOutput[0] : rollupOutput) ?? {};

  const serverOutFile = joinPath(
    serverOutDir,
    typeof entryFileNames === 'string'
      ? entryFileNames
      : (serverBuildFile ?? 'index.js'),
  );

  const ssrEntry = ssrEntryFlag ?? resolvedViteConfig.build.ssr;
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
      routes,
      appDirectory,
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

function getRemixConfigFromVite(viteConfig: any): {
  appDirectory: string;
  serverBuildFile: string;
  routes: ResolvedRoutes;
} {
  if (!viteConfig.__reactRouterPluginContext) {
    throw new Error('Could not resolve React Router config');
  }

  const {appDirectory, serverBuildFile, routes} =
    viteConfig.__reactRouterPluginContext.reactRouterConfig;

  return {
    appDirectory,
    serverBuildFile,
    routes,
  };
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
