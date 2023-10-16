import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputWarn,
} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {getLatestGitCommit} from '@shopify/cli-kit/node/git';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  renderFatalError,
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Logger, LogLevel} from '@shopify/cli-kit/node/output';
import {ciPlatform} from '@shopify/cli-kit/node/context/local';
import {
  createDeploy,
  DeploymentConfig,
  DeploymentHooks,
  parseToken,
} from '@shopify/oxygen-cli/deploy';

import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {getOxygenDeploymentData} from '../../lib/get-oxygen-deployment-data.js';
import {OxygenDeploymentData} from '../../lib/graphql/admin/get-oxygen-data.js';
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
    'env-branch': Flags.string({
      char: 'e',
      description: 'Environment branch (tag) for environment to deploy to',
      required: false,
    }),
    path: commonFlags.path,
    shop: commonFlags.shop,
    'public-deployment': Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    token: Flags.string({
      char: 't',
      description: 'Oxygen deployment token',
      env: 'SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN',
      required: false,
    }),
    'metadata-url': Flags.string({
      description:
        'URL that links to the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_URL',
    }),
    'metadata-user': Flags.string({
      description:
        'User that initiated the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_USER',
    }),
    'metadata-version': Flags.string({
      description:
        'A version identifier for the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_VERSION',
    }),
  };

  static hidden = true;

  async run() {
    const {flags} = await this.parse(Deploy);
    const deploymentOptions = this.flagsToOxygenDeploymentOptions(flags);

    await oxygenDeploy(deploymentOptions)
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

  private flagsToOxygenDeploymentOptions(flags: {
    [x: string]: any;
  }): OxygenDeploymentOptions {
    const camelFlags = flagsToCamelObject(flags);
    return {
      ...camelFlags,
      environmentTag: flags['env-branch'],
      path: flags.path ? resolvePath(flags.path) : process.cwd(),
    } as OxygenDeploymentOptions;
  }
}

interface OxygenDeploymentOptions {
  environmentTag?: string;
  path: string;
  publicDeployment: boolean;
  shop: string;
  token?: string;
  metadataUrl?: string;
  metadataUser?: string;
  metadataVersion?: string;
}

interface GitCommit {
  refs: string;
}

export async function oxygenDeploy(
  options: OxygenDeploymentOptions,
): Promise<void> {
  const {
    environmentTag,
    path,
    shop,
    publicDeployment,
    metadataUrl,
    metadataUser,
    metadataVersion,
  } = options;
  const ci = ciPlatform();
  let token = options.token;
  let branch: string | undefined;
  let deploymentData: OxygenDeploymentData | undefined;
  let deploymentEnvironmentTag: string | undefined = undefined;
  let gitCommit: GitCommit;

  try {
    gitCommit = await getLatestGitCommit(path);
    branch = (/HEAD -> ([^,]*)/.exec(gitCommit.refs) || [])[1];
  } catch (error) {
    outputWarn('Could not retrieve Git history.');
    branch = undefined;
  }

  if (!ci.isCI) {
    deploymentData = await getOxygenDeploymentData({
      root: path,
      flagShop: shop,
    });

    if (!deploymentData) {
      return;
    }

    token = token || deploymentData.oxygenDeploymentToken;
  }

  if (!token) {
    const errMessage = ci.isCI
      ? [
          'No deployment token provided. Use the ',
          {command: '--token'},
          ' flag to provide a token.',
        ]
      : `Could not obtain an Oxygen deployment token, please try again or contact Shopify support.`;
    throw new AbortError(errMessage);
  }

  if (!ci.isCI && !environmentTag && deploymentData?.environments) {
    if (deploymentData.environments.length > 1) {
      const choices = [
        ...deploymentData.environments.map(({name, branch}) => ({
          label: name,
          value: branch,
        })),
      ];

      deploymentEnvironmentTag = await renderSelectPrompt({
        message: 'Select an environment to deploy to',
        choices,
        defaultValue: branch,
      });
    } else {
      outputInfo(
        `Using current checked out branch ${branch} as environment tag`,
      );
    }
  }

  const config: DeploymentConfig = {
    assetsDir: 'dist/client',
    deploymentUrl: 'https://oxygen.shopifyapps.com',
    deploymentToken: parseToken(token as string),
    environmentTag: environmentTag || deploymentEnvironmentTag || branch,
    verificationMaxDuration: 180,
    metadata: {
      ...(metadataUrl ? {url: metadataUrl} : {}),
      ...(metadataUser ? {user: metadataUser} : {}),
      ...(metadataVersion ? {version: metadataVersion} : {}),
    },
    publicDeployment: publicDeployment,
    skipVerification: false,
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
    onVerificationComplete: () => resolveHealthCheck(),
    onUploadFilesStart: () => uploadStart(),
    onUploadFilesComplete: () => resolveUpload(),
    onVerificationError: (error: Error) => {
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
        title: 'Verifying deployment',
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
