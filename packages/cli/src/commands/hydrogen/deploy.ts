import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputWarn,
} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  renderFatalError,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Logger, LogLevel} from '@shopify/cli-kit/node/output';
import {
  createDeploy,
  DeploymentConfig,
  DeploymentHooks,
  parseToken,
} from '@shopify/oxygen-cli/deploy';

import {commonFlags} from '../../lib/flags.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';
import {runBuild} from './build.js';

export const deploymentLogger: Logger = (
  message: string,
  level: LogLevel = 'info',
) => {
  if (level === 'error' || level === 'warn') {
    outputWarn(message);
  }
};

export default class Deploy extends Command {
  static flags: any = {
    path: commonFlags.path,
    shop: commonFlags.shop,
    publicDeployment: Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    metadataUrl: Flags.string({
      description:
        'URL that links to the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_URL',
    }),
    metadataUser: Flags.string({
      description:
        'User that initiated the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_USER',
    }),
    metadataVersion: Flags.string({
      description:
        'A version identifier for the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_VERSION',
    }),
  };

  static hidden = true;

  async run() {
    const {flags} = await this.parse(Deploy);
    const actualPath = flags.path ? resolvePath(flags.path) : process.cwd();
    await oxygenDeploy({
      path: actualPath,
      shop: flags.shop,
      publicDeployment: flags.publicDeployment,
      metadataUrl: flags.metadataUrl,
      metadataUser: flags.metadataUser,
      metadataVersion: flags.metadataVersion,
    })
      .catch((error) => {
        renderFatalError(error);
        process.exit(1);
      })
      .finally(() => {
        // The Remix compiler hangs due to a bug in ESBuild:
        // https://github.com/evanw/esbuild/issues/2727
        // The actual build has already finished so we can kill the process
        process.exit(0);
      });
  }
}

interface OxygenDeploymentOptions {
  path: string;
  shop: string;
  publicDeployment: boolean;
  metadataUrl?: string;
  metadataUser?: string;
  metadataVersion?: string;
}

export async function oxygenDeploy(
  options: OxygenDeploymentOptions,
): Promise<void> {
  const {
    path,
    shop,
    publicDeployment,
    metadataUrl,
    metadataUser,
    metadataVersion,
  } = options;

  const token = await getOxygenDeploymentToken({
    root: path,
    flagShop: shop,
  });
  if (!token) {
    throw new AbortError('Could not obtain Oxygen deployment token');
  }

  const config: DeploymentConfig = {
    assetsDir: 'dist/client',
    deploymentUrl: 'https://oxygen.shopifyapps.com',
    deploymentToken: parseToken(token as string),
    healthCheckMaxDuration: 180,
    metadata: {
      ...(metadataUrl ? {url: metadataUrl} : {}),
      ...(metadataUser ? {user: metadataUser} : {}),
      ...(metadataVersion ? {version: metadataVersion} : {}),
    },
    publicDeployment: publicDeployment,
    skipHealthCheck: false,
    rootPath: path,
    skipBuild: false,
    workerOnly: false,
    workerDir: 'dist/worker',
  };

  let resolveUpload: () => void;
  const uploadPromise = new Promise<void>((resolve) => {
    resolveUpload = resolve;
  });

  let resolveHealthCheck: () => void;
  const healthCheckPromise = new Promise<void>((resolve) => {
    resolveHealthCheck = resolve;
  });

  let deployError: AbortError | null = null;
  let resolveDeploy: () => void;
  let rejectDeploy: (reason?: AbortError) => void;
  const deployPromise = new Promise<void>((resolve, reject) => {
    resolveDeploy = resolve;
    rejectDeploy = reject;
  });

  const hooks: DeploymentHooks = {
    buildFunction: async (assetPath: string | undefined): Promise<void> => {
      outputInfo(
        outputContent`${colors.whiteBright('Building project...')}`.value,
      );
      await runBuild({
        directory: path,
        assetPath,
        sourcemap: false,
        useCodegen: false,
      });
    },
    onHealthCheckComplete: () => resolveHealthCheck(),
    onUploadFilesStart: () => uploadStart(),
    onUploadFilesComplete: () => resolveUpload(),
    onHealthCheckError: (error: Error) => {
      deployError = new AbortError(
        error.message,
        'Please verify the deployment status in the Shopify Admin and retry deploying if necessary.',
      );
    },
    onUploadFilesError: (error: Error) => {
      deployError = new AbortError(
        error.message,
        'Check your connection and try again. If the problem persists, try again later or contact support.',
      );
    },
  };

  const uploadStart = async () => {
    outputInfo(
      outputContent`${colors.whiteBright('Deploying to Oxygen..\n')}`.value,
    );
    await renderTasks([
      {
        title: 'Uploading files',
        task: async () => await uploadPromise,
      },
      {
        title: 'Performing health check',
        task: async () => await healthCheckPromise,
      },
    ]);
  };

  await createDeploy({config, hooks, logger: deploymentLogger})
    .then((url: string | undefined) => {
      const deploymentType = config.publicDeployment ? 'public' : 'private';
      renderSuccess({
        body: ['Successfully deployed to Oxygen'],
        nextSteps: [
          [
            `Open ${url!} in your browser to view your ${deploymentType} deployment`,
          ],
        ],
      });
      resolveDeploy();
    })
    .catch((error) => {
      rejectDeploy(deployError || error);
    });

  return deployPromise;
}
