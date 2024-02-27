import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {linesToColumns} from '@shopify/cli-kit/common/string';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {getStorefrontEnvVariables} from './graphql/admin/pull-variables.js';
import {login} from './auth.js';

interface Arguments {
  envBranch?: string;
  root: string;
  fetchRemote?: boolean;
}

type EnvMap = Record<string, string>;

export async function getAllEnvironmentVariables({
  root,
  envBranch,
  fetchRemote = true,
}: Arguments) {
  const dotEnvPath = resolvePath(root, '.env');

  const [{remoteVariables, remoteSecrets}, {variables: localVariables}] =
    await Promise.all([
      // Get remote vars
      fetchRemote
        ? getRemoteVariables(root, envBranch)
        : {remoteVariables: {} as EnvMap, remoteSecrets: {} as EnvMap},
      // Get local vars
      fileExists(dotEnvPath).then((exists) =>
        exists ? readAndParseDotEnv(dotEnvPath) : {variables: {} as EnvMap},
      ),
    ]);

  const remoteSecretKeys = Object.keys(remoteSecrets);
  const remotePublicKeys = Object.keys(remoteVariables);
  const localKeys = Object.keys(localVariables);

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
        ...localKeys.map((key) => [key, 'from local .env']),
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

  return {
    ...remoteSecrets,
    ...remoteVariables,
    ...localVariables,
  };
}

async function getRemoteVariables(root: string, envBranch?: string) {
  const {session, config} = await login(root);

  const envVariables =
    (
      await getStorefrontEnvVariables(
        session,
        config.storefront!.id,
        envBranch,
      ).catch((error) => {
        renderWarning({
          headline: `Failed to load environment variables. The development server will still start, but the following error occurred:`,
          body: error?.stack ?? error?.message ?? error,
        });
      })
    )?.environmentVariables || [];

  const remoteVariables: EnvMap = {};
  const remoteSecrets: EnvMap = {};

  for (const {key, value, isSecret} of envVariables) {
    if (isSecret) remoteSecrets[key] = value;
    else remoteVariables[key] = value;
  }

  return {remoteVariables, remoteSecrets};
}
