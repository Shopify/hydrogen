import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputWarn,
} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {writeFile} from '@shopify/cli-kit/node/fs';
import {
  ensureIsClean,
  getLatestGitCommit,
  GitDirectoryNotCleanError,
} from '@shopify/cli-kit/node/git';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  renderFatalError,
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
  renderWarning,
} from '@shopify/cli-kit/node/ui';
import {Logger, LogLevel} from '@shopify/cli-kit/node/output';
import {ciPlatform} from '@shopify/cli-kit/node/context/local';
import {
  CompletedDeployment,
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
      description: 'Environment branch (tag) for environment to deploy to.',
      required: false,
    }),
    force: Flags.boolean({
      char: 'f',
      description:
        'Forces a deployment to proceed if there are uncommited changes in its Git repository.',
      default: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_FORCE',
      required: false,
    }),
    'generate-auth-bypass-token': Flags.boolean({
      description:
        'Generate an authentication bypass token, which can be used to perform end-to-end tests against the deployment.',
      required: false,
      default: false,
    }),
    path: commonFlags.path,
    shop: commonFlags.shop,
    'public-deployment': Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    'no-json-output': Flags.boolean({
      description:
        'Prevents the command from creating a JSON file containing the deployment URL (in CI environments).',
      required: false,
      default: false,
    }),
    token: Flags.string({
      char: 't',
      description: 'Oxygen deployment token',
      env: 'SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN',
      required: false,
    }),
    'metadata-description': Flags.string({
      description:
        'Description of the changes in the deployment. Defaults to the commit message of the latest commit if there are no uncommited changes.',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_DESCRIPTION',
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
  force: boolean;
  generateAuthBypassToken: boolean;
  noJsonOutput: boolean;
  path: string;
  publicDeployment: boolean;
  shop: string;
  token?: string;
  metadataDescription?: string;
  metadataUrl?: string;
  metadataUser?: string;
  metadataVersion?: string;
}

interface GitCommit {
  refs: string;
  hash: string;
}

// Have PRd this to export this interface from oxygen-cli
interface DeploymentVerificationDetailsResponse {
  url: string;
  status: string;
  error?: string;
}

export async function oxygenDeploy(
  options: OxygenDeploymentOptions,
): Promise<void> {
  const {
    environmentTag,
    force: forceOnUncommitedChanges,
    generateAuthBypassToken,
    noJsonOutput,
    path,
    shop,
    publicDeployment,
    metadataUrl,
    metadataUser,
    metadataVersion,
  } = options;
  let {metadataDescription} = options;

  let isCleanGit = true;
  try {
    await ensureIsClean(path);
  } catch (error) {
    if (error instanceof GitDirectoryNotCleanError) {
      isCleanGit = false;
    }

    if (!forceOnUncommitedChanges && !isCleanGit) {
      throw new AbortError('Uncommitted changes detected.', null, [
        [
          'Commit your changes before deploying or use the ',
          {command: '--force'},
          ' flag to deploy with uncommitted changes.',
        ],
      ]);
    }
  }

  const isCI = ciPlatform().isCI;
  let token = options.token;
  let branch: string | undefined;
  let commitHash: string | undefined;
  let deploymentData: OxygenDeploymentData | undefined;
  let deploymentEnvironmentTag: string | undefined = undefined;
  let gitCommit: GitCommit;

  try {
    gitCommit = await getLatestGitCommit(path);
    branch = (/HEAD -> ([^,]*)/.exec(gitCommit.refs) || [])[1];
    commitHash = gitCommit.hash;
  } catch (error) {
    outputWarn('Could not retrieve Git history.');
    branch = undefined;
  }

  if (!metadataDescription && !isCleanGit) {
    renderWarning({
      headline: 'No deployment description provided',
      body: [
        'Deploying uncommited changes, but no description has been provided. Use the ',
        {command: '--metadata-description'},
        'flag to provide a description. If no description is provided, the description defaults to ',
        {userInput: '<sha> with additional changes'},
        ' using the SHA of the last commit.',
      ],
    });
    metadataDescription = `${commitHash} with additional changes`;
  }

  if (!isCI) {
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
    const errMessage = isCI
      ? [
          'No deployment token provided. Use the ',
          {command: '--token'},
          ' flag to provide a token.',
        ]
      : `Could not obtain an Oxygen deployment token, please try again or contact Shopify support.`;
    throw new AbortError(errMessage);
  }

  if (!isCI && !environmentTag && deploymentData?.environments) {
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

  let deploymentUrl = 'https://oxygen.shopifyapps.com';
  if (process.env.UNSAFE_SHOPIFY_HYDROGEN_DEPLOYMENT_URL) {
    deploymentUrl = process.env.UNSAFE_SHOPIFY_HYDROGEN_DEPLOYMENT_URL;
    outputWarn(
      "Using a custom deployment service. Don't do this in production!",
    );
  }

  const config: DeploymentConfig = {
    assetsDir: 'dist/client',
    bugsnag: true,
    deploymentUrl,
    deploymentToken: parseToken(token as string),
    environmentTag: environmentTag || deploymentEnvironmentTag || branch,
    generateAuthBypassToken,
    verificationMaxDuration: 180,
    metadata: {
      ...(metadataDescription ? {description: metadataDescription} : {}),
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

  let resolveRoutableCheck: () => void;
  const routableCheckPromise = new Promise<void>((resolve) => {
    resolveRoutableCheck = resolve;
  });

  let resolveDeploymentCompletedVerification: () => void;
  const deploymentCompletedVerificationPromise = new Promise<void>(
    (resolve) => {
      resolveDeploymentCompletedVerification = resolve;
    },
  );

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
    onDeploymentCompleted: () => resolveDeploymentCompletedVerification(),
    onVerificationComplete: () => resolveRoutableCheck(),
    onDeploymentCompletedVerificationError() {
      deployError = new AbortError(
        'Unable to verify the deployment was completed successfully',
        'Please verify the deployment status in the Shopify Admin and retry deploying if necessary.',
      );
    },
    onDeploymentFailed: (details: DeploymentVerificationDetailsResponse) => {
      deployError = new AbortError(
        details.error || details.status,
        'Please verify the deployment status in the Shopify Admin and retry deploying if necessary.',
      );
    },
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
        title: 'Verifying deployment has been completed',
        task: async () => await deploymentCompletedVerificationPromise,
      },
      {
        title: 'Verifying worker deployment is routable',
        task: async () => await routableCheckPromise,
      },
    ]);
  };

  await createDeploy({config, hooks, logger: deploymentLogger})
    .then(async (completedDeployment: CompletedDeployment | undefined) => {
      const deploymentType = config.publicDeployment ? 'public' : 'private';

      const nextSteps: (string | {info: string})[][] = [
        [
          'Open',
          {info: completedDeployment!.url},
          `in your browser to view your ${deploymentType} deployment`,
        ],
      ];
      if (completedDeployment?.authBypassToken) {
        nextSteps.push([
          'Use the',
          {info: completedDeployment.authBypassToken},
          'token to perform end-to-end tests against the deployment',
        ]);
      }

      renderSuccess({
        body: ['Successfully deployed to Oxygen'],
        nextSteps,
      });
      // in CI environments, output to a file so consequent steps can access the URL
      // the formatting of this file is likely to change in future versions.
      if (isCI && !noJsonOutput) {
        await writeFile(
          'h2_deploy_log.json',
          JSON.stringify(completedDeployment!),
        );
      }
      resolveDeploy();
    })
    .catch((error) => {
      rejectDeploy(deployError || error);
    });

  return deployPromise;
}
