import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {linesToColumns} from '@shopify/cli-kit/common/string';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';
import {type AbortError} from '@shopify/cli-kit/node/error';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {getStorefrontEnvVariables} from './graphql/admin/pull-variables.js';
import {getStorefrontEnvironments} from './graphql/admin/list-environments.js';
import {findEnvironmentByBranchOrThrow} from './common.js';
import {login} from './auth.js';

type EnvMap = Record<string, string>;

interface Arguments {
  root: string;
  envHandle?: string;
  envBranch?: string;
  fetchRemote?: boolean;
  envFile: string;
  localVariables?: EnvMap;
}

const createEmptyRemoteVars = () => ({
  remoteVariables: {} as EnvMap,
  remoteSecrets: {} as EnvMap,
});

export async function getAllEnvironmentVariables({
  root,
  envHandle,
  envBranch,
  envFile,
  fetchRemote = true,
  localVariables: inlineLocalVariables,
}: Arguments) {
  const [{remoteVariables, remoteSecrets}, {variables: localVariables}] =
    await Promise.all([
      // Get remote vars
      fetchRemote
        ? getRemoteVariables(root, envHandle, envBranch).catch(
            (error: AbortError) => {
              renderWarning({
                headline:
                  'Failed to load environment variables from Shopify. The development server will still start, but the following error occurred:',
                body: [error.message, error.tryMessage, error.nextSteps]
                  .filter(Boolean)
                  .join('\n\n'),
              });

              return createEmptyRemoteVars();
            },
          )
        : createEmptyRemoteVars(),
      // Get local vars
      inlineLocalVariables
        ? {variables: inlineLocalVariables}
        : getLocalVariables(root, envFile),
    ]);

  const remoteSecretKeys = Object.keys(remoteSecrets);
  const remotePublicKeys = Object.keys(remoteVariables);
  const localKeys = Object.keys(localVariables);

  function logInjectedVariables() {
    if (
      localKeys.length > 0 ||
      remotePublicKeys.length + remoteSecretKeys.length > 0
    ) {
      outputInfo('\nEnvironment variables injected into MiniOxygen:\n');

      outputInfo(
        linesToColumns([
          ...remotePublicKeys
            .filter((key) => !localKeys.includes(key))
            .map((key) => [key, 'from Oxygen']),
          ...localKeys.map((key) => [key, `from local ${envFile}`]),
          // Ensure secret variables always get added to the bottom of the list
          ...remoteSecretKeys
            .filter((key) => !localKeys.includes(key))
            .map((key) => [
              colors.dim(key),
              colors.dim('from Oxygen (Marked as secret)'),
            ]),
        ]),
      );
    }
  }

  return {
    logInjectedVariables,
    remoteVariables,
    remoteSecrets,
    localVariables,
    allVariables: {
      ...remoteSecrets,
      ...remoteVariables,
      ...localVariables,
    },
  };
}

async function getRemoteVariables(
  root: string,
  envHandle?: string,
  envBranch?: string,
) {
  const {session, config} = await login(root);

  if (envBranch) {
    const environments =
      (await getStorefrontEnvironments(session, config.storefront!.id))
        ?.environments || [];

    envHandle = findEnvironmentByBranchOrThrow(environments, envBranch).handle;
  }

  const envVariables =
    (await getStorefrontEnvVariables(session, config.storefront!.id, envHandle))
      ?.environmentVariables || [];

  const remoteVariables: EnvMap = {};
  const remoteSecrets: EnvMap = {};

  for (const {key, value, isSecret} of envVariables) {
    if (isSecret) remoteSecrets[key] = value;
    else remoteVariables[key] = value;
  }

  return {remoteVariables, remoteSecrets};
}

export async function getLocalVariables(root: string, envFile: string) {
  const dotEnvPath = resolvePath(root, envFile);

  return await fileExists(dotEnvPath).then((exists) =>
    exists ? readAndParseDotEnv(dotEnvPath) : {variables: {} as EnvMap},
  );
}
