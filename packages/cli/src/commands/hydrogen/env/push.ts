import Command from '@shopify/cli-kit/node/base-command';
import {diffLines} from 'diff';
import {Flags} from '@oclif/core';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {login} from '../../../lib/auth.js';
import {getCliCommand} from '../../../lib/shell.js';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderInfo,
  renderSuccess,
} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputToken,
  outputWarn,
} from '@shopify/cli-kit/node/output';
import {
  createEnvironmentCliChoiceLabel,
  findEnvironmentOrThrow,
  orderEnvironmentsBySafety,
} from '../../../lib/common.js';
import {
  Environment,
  getStorefrontEnvironments,
} from '../../../lib/graphql/admin/list-environments.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';
import {pushStorefrontEnvVariables} from '../../../lib/graphql/admin/push-variables.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  readAndParseDotEnv,
  createDotEnvFileLine,
} from '@shopify/cli-kit/node/dot-env';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

export default class EnvPush extends Command {
  static description =
    'Push environment variables from the local .env file to your linked Hydrogen storefront.';

  static flags = {
    ...commonFlags.env,
    'env-file': Flags.string({
      description:
        "Path to an environment file to override existing environment variables for the selected environment. \
Defaults to the '.env' located in your project path `--path`.",
    }),
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(EnvPush);
    await runEnvPush({...flagsToCamelObject(flags)});
  }
}

interface Flags {
  env?: string;
  envFile?: string;
  path?: string;
}

export async function runEnvPush({
  env: envHandle,
  envFile,
  path = process.cwd(),
}: Flags) {
  let validatedEnvironment: Environment;

  // Ensure local .env file
  const dotEnvPath = envFile || resolvePath(path, '.env');
  const {variables: localVariables} = await readAndParseDotEnv(dotEnvPath);

  // Authenticate
  const [{session, config}, cliCommand] = await Promise.all([
    login(path),
    getCliCommand(),
  ]);

  const linkedStorefront = await verifyLinkedStorefront({
    root: path,
    session,
    config,
    cliCommand,
  });

  if (!linkedStorefront) return;

  config.storefront = linkedStorefront;

  // Fetch environments
  const {environments: environmentsData} =
    (await getStorefrontEnvironments(session, config.storefront.id)) ?? {};

  if (!environmentsData) {
    throw new AbortError('Failed to fetch environments');
  }

  const environments = orderEnvironmentsBySafety(environmentsData);

  if (environments.length === 0) {
    throw new AbortError('No environments found');
  }

  // Select and validate an environment, if not passed via the flag
  if (envHandle) {
    validatedEnvironment = findEnvironmentOrThrow(environments, envHandle);
  } else {
    // Environment flag not passed
    const choices = [
      ...environments.map(({id, name, branch, handle}) => {
        return {
          label: createEnvironmentCliChoiceLabel(name, handle, branch),
          value: id,
        };
      }),
    ];

    const pushToBranchSelection = await renderSelectPrompt({
      message: 'Select an environment to overwrite its environment variables:',
      choices,
    });

    validatedEnvironment = environments.find(
      ({id}) => id === pushToBranchSelection,
    )!;
  }

  // Fetch remote variables
  const {environmentVariables = []} =
    (await getStorefrontEnvVariables(
      session,
      config.storefront.id,
      validatedEnvironment.handle,
    )) ?? {};

  // Normalize variables
  const remoteVars = environmentVariables.filter(
    ({isSecret, readOnly}) => !isSecret && !readOnly,
  );
  const comparableRemoteVars =
    remoteVars
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({key, value}) => createDotEnvFileLine(key, value))
      .join('\n') + '\n';

  const compareableLocalVars =
    Object.keys(localVariables)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        const {isSecret, readOnly} =
          environmentVariables.find((variable) => variable.key === key) ?? {};
        if (isSecret || readOnly) return acc;
        return [...acc, createDotEnvFileLine(key, localVariables[key])];
      }, [] as string[])
      .join('\n') + '\n';

  // Confirm changes and show a generate diff of changes
  if (!validatedEnvironment.name)
    throw new AbortError('Missing environment name');

  // Generate a list of remote read only or secrets
  const remoteReadOnlyOrSecrets = environmentVariables.reduce(
    (acc, {isSecret, readOnly, key}) => {
      if (!isSecret && !readOnly) return acc;
      const localVar = localVariables[key];
      const remoteVar = environmentVariables.find(
        (variable) => variable.key === key,
      );
      if (localVar === remoteVar?.value) return acc;
      return [...acc, key];
    },
    [] as string[],
  );

  if (remoteReadOnlyOrSecrets.length) {
    outputWarn(
      `Variables that are read only or contain secret values cannot be pushed from the CLI: ${remoteReadOnlyOrSecrets.join(
        ', ',
      )}.\n`,
    );
  }

  if (compareableLocalVars === comparableRemoteVars) {
    renderInfo({
      body: 'No changes to your environment variables.',
    });
    return;
  } else {
    const diff = diffLines(comparableRemoteVars, compareableLocalVars);
    const confirmPush = await renderConfirmationPrompt({
      confirmationMessage: 'Yes, confirm changes',
      cancellationMessage: 'No, make changes later',
      message:
        outputContent`We'll make the following changes to your environment variables for ${
          validatedEnvironment.name
        }:

${outputToken.linesDiff(diff)}
Continue?`.value,
    });

    // Cancelled making changes
    if (!confirmPush) return;
  }

  if (!validatedEnvironment.id) throw new AbortError('Missing environment ID');
  const {userErrors} = await pushStorefrontEnvVariables(
    session,
    config.storefront.id,
    validatedEnvironment.id,
    Object.entries(localVariables).map(([key, value]) => ({key, value})),
  );

  if (userErrors.length) {
    throw new AbortError(
      'Failed to upload and save environment variables.',
      userErrors[0]?.message,
    );
  }

  renderSuccess({
    body: `Environment variables push to ${
      validatedEnvironment.name ?? 'Preview'
    } was successful.`,
  });
}
