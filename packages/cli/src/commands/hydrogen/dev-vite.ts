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
import {Flags, Config} from '@oclif/core';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {prepareDiffDirectory} from '../../lib/template-diff.js';
import {setH2OPluginContext} from '../../lib/vite/shared.js';
import {getGraphiQLUrl} from '../../lib/graphiql-url.js';
import {
  getDebugBannerLine,
  startTunnelAndPushConfig,
  checkMockShopAndByPassTunnel,
} from '../../lib/dev-shared.js';
import {getStorefrontId} from './customer-account/push.js';
import {getCliCommand} from '../../lib/shell.js';

export default class DevVite extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.entry,
    ...overrideFlag(commonFlags.port, {
      port: {default: undefined, required: false},
    }),
    ...commonFlags.codegen,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    ...commonFlags.debug,
    ...commonFlags.inspectorPort,
    host: Flags.boolean({
      description: 'Expose the server to the network',
      default: false,
      required: false,
    }),
    ...commonFlags.envBranch,
    'disable-version-check': Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    ...commonFlags.diff,
    ...commonFlags.customerAccountPush,
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
  port?: number;
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
  customerAccountPush?: boolean;
  cliConfig: Config;
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
  customerAccountPush: customerAccountPushFlag = false,
  cliConfig,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  const root = appPath ?? process.cwd();

  let appName: string | undefined;

  const cliCommandPromise = getCliCommand(root);
  const backgroundPromise = checkMockShopAndByPassTunnel(
    root,
    customerAccountPushFlag,
  ).then(async (customerAccountPush) => {
    // ensure this occur before `getConfig` since it can run link and changed env vars
    if (customerAccountPush) {
      await getStorefrontId(root);
    }

    const {shop, storefront} = await getConfig(root);
    const storefrontId = storefront?.id;
    appName = storefront?.title;

    return {
      storefrontId,
      customerAccountPush,
      fetchRemote: !!shop && !!storefrontId,
    };
  });

  const envPromise = backgroundPromise.then(({fetchRemote}) =>
    getAllEnvironmentVariables({
      root,
      envBranch,
      fetchRemote,
    }),
  );

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

  const [tunnelHost] = await Promise.all([
    backgroundPromise.then(({customerAccountPush, storefrontId}) =>
      customerAccountPush
        ? startTunnelAndPushConfig(root, cliConfig, publicPort, storefrontId)
        : undefined,
    ),
    viteServer.listen(publicPort),
  ]);

  const publicUrl = new URL(
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!,
  );

  const finalHost = tunnelHost || publicUrl.toString() || publicUrl.origin;

  // Start the public facing server with the port passed by the user.
  enhanceH2Logs({
    rootDirectory: root,
    host: finalHost,
    cliCommand: await cliCommandPromise,
  });

  await envPromise; // Prints the injected env vars
  console.log('');
  viteServer.printUrls();
  viteServer.bindCLIShortcuts({print: true});
  console.log('\n');

  const customSections = [];

  if (!disableVirtualRoutes) {
    customSections.push({
      body: [
        `View GraphiQL API browser: \n${getGraphiQLUrl({
          host: finalHost,
        })}`,
        `View server network requests: \n${finalHost}/subrequest-profiler`,
      ].map((value, index) => ({
        subdued: `${index != 0 ? '\n\n' : ''}${value}`,
      })),
    });
  }

  if (debug) {
    customSections.push({
      body: {warn: getDebugBannerLine(inspectorPort)},
    });
  }

  if (customSections.length > 0) {
    renderInfo({
      body: [
        `View ${appName ? colors.cyan(appName) : 'Hydrogen'} app:`,
        {link: {url: finalHost}},
      ],
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
