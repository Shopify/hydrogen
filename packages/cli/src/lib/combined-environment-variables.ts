import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  outputContent,
  outputInfo,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';

import {colors} from './colors.js';
import {pullRemoteEnvironmentVariables} from './pull-environment-variables.js';
import {getConfig} from './shopify-config.js';

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
    outputInfo(
      `${colors.bold('Injecting environment variables into MiniOxygen...')}`,
    );
  }

  let storefrontTitle = '';

  if (remoteEnvironmentVariables.length) {
    const {storefront} = await getConfig(root);
    if (storefront) {
      storefrontTitle = storefront.title;
    }
  }

  remoteEnvironmentVariables.forEach(({key, isSecret}) => {
    if (localKeys.has(key)) {
      outputIgnoringKey(key, `overwritten via ${colors.yellow('.env')}`);
    } else if (isSecret) {
      outputIgnoringKey(key, 'value is marked as secret');
    } else {
      outputUsingKey(key, storefrontTitle);
    }
  });

  [...localKeys].forEach((keyName: string) => {
    outputUsingKey(keyName, '.env');
  });

  return {
    ...formattedRemoteVariables,
    ...localEnvironmentVariables,
  };
}

function outputUsingKey(keyName: string, source: string) {
  outputInfo(
    outputContent`  Using ${outputToken.green(
      keyName,
    )} from ${outputToken.yellow(source)}`.value,
  );
}

function outputIgnoringKey(keyName: string, reason: string) {
  outputInfo(
    outputContent`${colors.dim(
      `  Ignoring ${colors.green(keyName)} (${reason})`,
    )}`.value,
  );
}
