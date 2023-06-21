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
} from '@shopify/oxygen-cli/dist/deploy/index.js';

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
      env: 'OXYGEN_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    metadataUrl: Flags.string({
      description:
        'URL that links to the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_URL',
    }),
    metadataUser: Flags.string({
      description:
        'User that initiated the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_USER',
    }),
    metadataVersion: Flags.string({
      description:
        'A version identifier for the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_VERSION',
    }),
  };

  static hidden = true;

  async run() {
    const {flags} = await this.parse(Deploy);
    const actualPath = flags.path ? resolvePath(flags.path) : process.cwd();
    oxygenDeploy({
      path: actualPath,
      shop: flags.shop,
      publicDeployment: flags.publicDeployment,
      metadataUrl: flags.metadataUrl,
      metadataUser: flags.metadataUser,
      metadataVersion: flags.metadataVersion,
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

export async function oxygenDeploy(options: OxygenDeploymentOptions) {
  try {
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
      return;
    }

    const config: DeploymentConfig = {
      assetsDir: 'dist/client',
      deploymentUrl: 'https://oxygen.shopifyapps.com',
      deploymentToken: parseToken(token as string),
      healthCheckMaxDuration: 180,
      metadata: {
        url: metadataUrl,
        user: metadataUser,
        version: metadataVersion,
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

    const hooks: DeploymentHooks = {
      buildFunction: async (assetPath: string | undefined): Promise<void> => {
        try {
          await runBuild({
            path,
            assetPath,
            sourcemap: false,
            useCodegen: false,
          });
        } catch (error) {
          throw error;
        }
      },
      onHealthCheckComplete: () => resolveHealthCheck(),
      onUploadFilesStart: () => uploadStart(),
      onUploadFilesComplete: () => resolveUpload(),
      onHealthCheckError: (error: Error) => {
        throw new AbortError(
          error.message,
          'Please verify the deployment status in the Shopify Admin and retry deploying again if necessary.',
        );
      },
      onUploadFilesError: (error: Error) => {
        throw new AbortError(
          error.message,
          'Check your connection and try again. If the problem persists, try again later or contact support.',
        );
      },
    };

    const uploadStart = async () => {
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

    outputInfo(
      outputContent`${colors.whiteBright('Deploying to Oxygen..')}`.value,
    );

    await createDeploy({config, hooks, logger: deploymentLogger}).then(
      (url: string | undefined) => {
        const deploymentType = config.publicDeployment ? 'public' : 'private';
        renderSuccess({
          body: ['Successfully deployed to Oxygen'],
          nextSteps: [
            [
              `Open ${url!} in your browser to view your ${deploymentType} deployment`,
            ],
          ],
        });
      },
    );
  } catch (error) {
    if (error instanceof AbortError) {
      renderFatalError(error);
    } else {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error ocurred. Please try again or contact support if the error persists.';
      renderFatalError(new AbortError(message));
    }
  } finally {
    // The Remix compiler hangs due to a bug in ESBuild:
    // https://github.com/evanw/esbuild/issues/2727
    // The actual build has already finished so we can kill the process
    process.exit(0);
  }
}
