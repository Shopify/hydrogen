import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {linesToColumns} from '@shopify/cli-kit/common/string';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';
import colors from '@shopify/cli-kit/node/colors';
import {pullRemoteEnvironmentVariables} from './pull-environment-variables.js';

interface Arguments {
  envBranch?: string;
  root: string;
  shop?: string;
}
export async function combinedEnvironmentVariables({
  envBranch,
  root,
  shop,
}: Arguments) {
  const remoteEnvironmentVariables = await pullRemoteEnvironmentVariables({
    root,
    flagShop: shop,
    silent: true,
    envBranch,
  });

  const formattedRemoteVariables = remoteEnvironmentVariables?.reduce(
    (a, v) => ({...a, [v.key]: v.value}),
    {},
  );

  const dotEnvPath = resolvePath(root, '.env');
  const localEnvironmentVariables = (await fileExists(dotEnvPath))
    ? (await readAndParseDotEnv(dotEnvPath)).variables
    : {};

  const remoteKeys = new Set(
    remoteEnvironmentVariables.map((variable) => variable.key),
  );

  const localKeys = new Set(Object.keys(localEnvironmentVariables));

  if ([...remoteKeys, ...localKeys].length) {
    outputInfo('\nEnvironment variables injected into MiniOxygen:\n');
  }

  let rows: [string, string][] = [];

  remoteEnvironmentVariables
    .filter(({isSecret}) => !isSecret)
    .forEach(({key}) => {
      if (!localKeys.has(key)) {
        rows.push([key, 'from Oxygen']);
      }
    });

  localKeys.forEach((key) => {
    rows.push([key, 'from local .env']);
  });

  // Ensure secret variables always get added to the bottom of the list
  remoteEnvironmentVariables
    .filter(({isSecret}) => isSecret)
    .forEach(({key}) => {
      if (!localKeys.has(key)) {
        rows.push([
          colors.dim(key),
          colors.dim(`from Oxygen (Marked as secret)`),
        ]);
      }
    });

  outputInfo(linesToColumns(rows));

  return {
    ...formattedRemoteVariables,
    ...localEnvironmentVariables,
  };
}
