import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enhanceH2Logs, muteDevLogs} from '../../lib/log.js';
import {
  commonFlags,
  flagsToCamelObject,
  overrideFlag,
} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputDebug, outputInfo} from '@shopify/cli-kit/node/output';
import {Flags, Config} from '@oclif/core';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {prepareDiffDirectory} from '../../lib/template-diff.js';
import {setH2OPluginContext} from '../../lib/vite/shared.js';
import {getGraphiQLUrl} from '../../lib/graphiql-url.js';
import {getDebugBannerLine} from '../../lib/mini-oxygen/workerd.js';
import {startTunnelPlugin, pollTunnelURL} from '../../lib/tunneling.js';

export default class DevVite extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    path: commonFlags.path,
    entry: commonFlags.entry,
    port: overrideFlag(commonFlags.port, {default: undefined, required: false}),
    codegen: overrideFlag(commonFlags.codegen, {
      description:
        commonFlags.codegen.description! +
        ' It updates the types on file save.',
    }),
    codegenConfigPath: commonFlags.codegenConfigPath,
    // sourcemap: commonFlags.sourcemap,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    debug: commonFlags.debug,
    inspectorPort: commonFlags.inspectorPort,
    host: Flags.boolean({
      description: 'Expose the server to the network',
      default: false,
      required: false,
    }),
    envBranch: commonFlags.envBranch,
    ['disable-version-check']: Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    diff: commonFlags.diff,
    tunnel: commonFlags.tunnel,
    tunnelUrl: commonFlags.tunnelUrl,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(DevVite);
    let directory = flags.path ? path.resolve(flags.path) : process.cwd();

    if (flags.diff) {
      directory = await prepareDiffDirectory(directory, true);
    }

    await runDev({
      ...flagsToCamelObject(flags),
      path: directory,
      isLocalDev: flags.diff,
      cliConfig: this.config,
    });
  }
}

type DevOptions = {
  entry?: string;
  port: number;
  path?: string;
  codegen?: boolean;
  host?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  disableVersionCheck?: boolean;
  envBranch?: string;
  debug?: boolean;
  sourcemap?: boolean;
  inspectorPort: number;
  isLocalDev?: boolean;
  tunnel?: boolean;
  tunnelUrl?: string;
  cliConfig?: Config;
};

export async function runDev({
  entry: ssrEntry,
  port: appPort,
  path: appPath,
  host,
  codegen: useCodegen = false,
  codegenConfigPath,
  disableVirtualRoutes,
  envBranch,
  debug = false,
  disableVersionCheck = false,
  inspectorPort,
  isLocalDev = false,
  tunnel: useTunnel = false,
  tunnelUrl,
  cliConfig,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  const root = appPath ?? process.cwd();

  let appName: string | undefined;
  const envPromise = getConfig(root).then(({shop, storefront}) => {
    appName = storefront?.title;
    const fetchRemote = !!shop && !!storefront?.id;
    return getAllEnvironmentVariables({root, fetchRemote, envBranch});
  });

  const vite = await import('vite');

  // Allow Vite to read files from the Hydrogen packages in local development.
  const fs = isLocalDev
    ? {allow: [root, fileURLToPath(new URL('../../../../', import.meta.url))]}
    : undefined;

  const viteServer = await vite.createServer({
    root,
    server: {fs, host: host ? true : undefined},
    ...setH2OPluginContext({
      cliOptions: {
        debug,
        ssrEntry,
        envPromise,
        inspectorPort,
        disableVirtualRoutes,
      },
    }),
  });

  process.once('SIGTERM', async () => {
    try {
      await viteServer.close();
    } finally {
      process.exit();
    }
  });

  if (
    !viteServer.config.plugins.find((plugin) => plugin.name === 'hydrogen:main')
  ) {
    await viteServer.close();
    throw new AbortError(
      'Hydrogen plugin not found.',
      'Add `hydrogen()` plugin to your Vite config.',
    );
  }

  const codegenProcess = useCodegen
    ? spawnCodegenProcess({
        rootDirectory: root,
        configFilePath: codegenConfigPath,
      })
    : undefined;

  // handle unhandledRejection so that the process won't exit
  process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection: ', err);
  });

  // Store the port passed by the user in the config.
  const publicPort = appPort ?? viteServer.config.server.port ?? 3000;

  // TODO -- Need to change Remix' <Scripts/> component
  // const assetsPort = await findPort(publicPort + 100);
  // if (assetsPort) {
  //   // Note: Set this env before loading Remix config!
  //   process.env.HYDROGEN_ASSET_BASE_URL = buildAssetsUrl(assetsPort);
  // }

  await viteServer.listen(publicPort);

  const publicUrl = new URL(
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!,
  );

  let finalHost = publicUrl.origin;
  if (useTunnel && cliConfig) {
    if (tunnelUrl) {
      finalHost = tunnelUrl;
    } else {
      outputInfo('Starting tunnel...');
      const tunnel = await startTunnelPlugin(
        cliConfig,
        publicPort,
        'cloudflare',
      );
      finalHost = await pollTunnelURL(tunnel);
    }
  }

  // Start the public facing server with the port passed by the user.
  enhanceH2Logs({rootDirectory: root, host: finalHost});

  await envPromise; // Prints the injected env vars
  console.log('');
  viteServer.printUrls();
  viteServer.bindCLIShortcuts({print: true});
  console.log('\n');

  const customSections = [];

  if (!disableVirtualRoutes) {
    customSections.push({
      body: [
        `${colors.dim('View GraphiQL API browser:')} ${getGraphiQLUrl({
          host: finalHost,
        })}`,
        `\n${colors.dim(
          'View server network requests:',
        )} ${finalHost}/subrequest-profiler`,
      ].map((value, index) => `${index != 0 ? '\n' : ''}${value}`),
    });
  }

  if (debug) {
    customSections.push({
      body: {warn: getDebugBannerLine(inspectorPort)},
    });
  }

  if (customSections.length > 0) {
    renderInfo({
      body: [`View ${appName ?? 'Hydrogen'} app:`, {link: {url: finalHost}}],
      customSections,
    });
  }

  checkRemixVersions();
  if (!disableVersionCheck) {
    displayDevUpgradeNotice({targetPath: root});
  }

  return {
    async close() {
      codegenProcess?.kill(0);
      await viteServer.close();
    },
  };
}
