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

export const REMIX_COMPILER_ERROR_MESSAGE =
  "Classic Remix Compiler projects are no longer supported, please upgrade to Vite by running 'npx shopify hydrogen setup vite'";

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
    getReactRouterOrRemixConfigFromVite(resolvedViteConfig);

  // Check if React Router viteEnvironmentApi is enabled
  const reactRouterConfig = resolvedViteConfig.__reactRouterPluginContext?.reactRouterConfig;
  const hasViteEnvironmentApi = reactRouterConfig?.future?.unstable_viteEnvironmentApi === true;

  const baseOutDir = resolvedViteConfig.build.outDir;
  
  // When viteEnvironmentApi is enabled, React Router creates separate client/server directories
  const serverOutDir = hasViteEnvironmentApi 
    ? joinPath(baseOutDir, 'server')
    : baseOutDir;
  
  const clientOutDir = hasViteEnvironmentApi
    ? joinPath(baseOutDir, 'client') 
    : serverOutDir.replace(/server$/, 'client');

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
      routes: routes ?? {},
      appDirectory: appDirectory ?? joinPath(resolvedViteConfig.root, 'app'),
      rootDirectory: resolvedViteConfig.root,
      serverEntryPoint:
        (
          await findFileWithExtension(
            dirname(resolvedSsrEntry),
            basename(resolvedSsrEntry),
          )
        ).filepath || resolvedSsrEntry,
    } satisfies ResolvedRRConfig,
  };
}

function getReactRouterOrRemixConfigFromVite(viteConfig: any) {
  try {
    const reactRouterConfig = getReactRouterConfigFromVite(viteConfig);
    return reactRouterConfig;
  } catch (error) {
    const remixConfig = getRemixConfigFromVite(viteConfig);
    return remixConfig;
  }
}

function getReactRouterConfigFromVite(viteConfig: any): {
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

function getRemixConfigFromVite(viteConfig: any) {
  const {remixConfig} =
    findHydrogenPlugin(viteConfig)?.api?.getPluginOptions() ?? {};

  return remixConfig
    ? {
        appDirectory: remixConfig.appDirectory,
        serverBuildFile: remixConfig.serverBuildFile,
        routes: remixConfig.routes satisfies ResolvedRoutes,
      }
    : {};
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
