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

type BuildConfig = {
  appDirectory?: string;
  buildDirectory?: string;
  clientOutDir: string;
  serverBuildFile?: string;
  serverOutDir: string;
  routes?: ResolvedRoutes;
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

  const {appDirectory, clientOutDir, serverBuildFile, serverOutDir, routes} =
    getBuildConfigFromVite(resolvedViteConfig);

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

type ResolveViteOutputDirsOptions = {
  routingBuildDirectory?: string;
  serverEnvironmentOutDir?: string;
  clientEnvironmentOutDir?: string;
  buildOutDir: string;
};

function resolveViteOutputDirs({
  routingBuildDirectory,
  serverEnvironmentOutDir,
  clientEnvironmentOutDir,
  buildOutDir,
}: ResolveViteOutputDirsOptions) {
  if (routingBuildDirectory) {
    return {
      clientOutDir: joinPath(routingBuildDirectory, 'client'),
      serverOutDir: joinPath(routingBuildDirectory, 'server'),
    };
  }

  const serverOutDir = serverEnvironmentOutDir ?? buildOutDir;
  const clientOutDir =
    clientEnvironmentOutDir && clientEnvironmentOutDir !== serverOutDir
      ? clientEnvironmentOutDir
      : serverOutDir.replace(/server$/, 'client');

  return {
    clientOutDir,
    serverOutDir,
  };
}

type PartialBuildConfig = Omit<BuildConfig, 'clientOutDir' | 'serverOutDir'>;

function getBuildConfigFromVite(viteConfig: any): BuildConfig {
  const buildConfig =
    getReactRouterConfigFromVite(viteConfig) ??
    getRemixConfigFromVite(viteConfig);

  const {clientOutDir, serverOutDir} = resolveViteOutputDirs({
    routingBuildDirectory: buildConfig?.buildDirectory,
    serverEnvironmentOutDir: viteConfig.environments.ssr?.build.outDir,
    clientEnvironmentOutDir: viteConfig.environments.client?.build.outDir,
    buildOutDir: viteConfig.build.outDir,
  });

  return {
    ...buildConfig,
    clientOutDir,
    serverOutDir,
  };
}

function getReactRouterConfigFromVite(
  viteConfig: any,
): PartialBuildConfig | undefined {
  if (!viteConfig.__reactRouterPluginContext) return;

  const {appDirectory, buildDirectory, serverBuildFile, routes} =
    viteConfig.__reactRouterPluginContext.reactRouterConfig;

  return {
    appDirectory,
    buildDirectory,
    serverBuildFile,
    routes,
  };
}

function getRemixConfigFromVite(
  viteConfig: any,
): PartialBuildConfig | undefined {
  const {remixConfig} =
    findHydrogenPlugin(viteConfig)?.api?.getPluginOptions() ?? {};

  if (remixConfig) {
    return {
      appDirectory: remixConfig.appDirectory,
      serverBuildFile: remixConfig.serverBuildFile,
      routes: remixConfig.routes satisfies ResolvedRoutes,
    };
  }
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
