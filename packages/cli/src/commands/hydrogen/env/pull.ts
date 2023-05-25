import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {outputSuccess, outputWarn} from '@shopify/cli-kit/node/output';
import {fileExists, writeFile} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';

import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {pullRemoteEnvironmentVariables} from '../../../lib/pull-environment-variables.js';
import {getConfig} from '../../../lib/shopify-config.js';

export default class EnvPull extends Command {
  static description =
    'Populate your .env with variables from your Hydrogen storefront.';

  static hidden = true;

  static flags = {
    ['env-branch']: commonFlags['env-branch'],
    path: commonFlags.path,
    shop: commonFlags.shop,
    force: commonFlags.force,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(EnvPull);
    await pullVariables({...flagsToCamelObject(flags)});
  }
}

interface Flags {
  envBranch?: string;
  force?: boolean;
  path?: string;
  shop?: string;
}

export async function pullVariables({
  envBranch,
  force,
  path,
  shop: flagShop,
}: Flags) {
  const actualPath = path ?? process.cwd();

  const environmentVariables = await pullRemoteEnvironmentVariables({
    root: actualPath,
    flagShop,
    envBranch,
  });

  if (!environmentVariables.length) {
    return;
  }

  const dotEnvPath = resolvePath(actualPath, '.env');

  if ((await fileExists(dotEnvPath)) && !force) {
    const overwrite = await renderConfirmationPrompt({
      message:
        'Warning: .env file already exists. Do you want to overwrite it?',
    });

    if (!overwrite) {
      return;
    }
  }

  let hasSecretVariables = false;
  const contents =
    environmentVariables
      .map(({key, value, isSecret}) => {
        let line = `${key}="${value}"`;

        if (isSecret) {
          hasSecretVariables = true;
          line =
            `# ${key} is marked as secret and its value is hidden\n` + line;
        }

        return line;
      })
      .join('\n') + '\n';

  if (hasSecretVariables) {
    const {storefront: configStorefront} = await getConfig(actualPath);

    outputWarn(
      `${
        configStorefront!.title
      } contains environment variables marked as secret, \
so their values weren’t pulled.`,
    );
  }

  await writeFile(dotEnvPath, contents);

  outputSuccess('Updated .env');
}
