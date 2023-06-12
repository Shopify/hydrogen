import {diffLines} from 'diff';
import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderInfo,
  renderWarning,
  renderSuccess,
} from '@shopify/cli-kit/node/ui';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import {fileExists, readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {patchEnvFile} from '@shopify/cli-kit/node/dot-env';
import colors from '@shopify/cli-kit/node/colors';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {pullRemoteEnvironmentVariables} from '../../../lib/pull-environment-variables.js';
import {getConfig} from '../../../lib/shopify-config.js';

export default class EnvPull extends Command {
  static description =
    'Populate your .env with variables from your Hydrogen storefront.';

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

  const fileName = colors.whiteBright(`.env`);

  const dotEnvPath = resolvePath(actualPath, '.env');

  const fetchedEnv: Record<string, string> = {};
  environmentVariables.forEach(({isSecret, key, value}) => {
    // We need to force an empty string for secret variables, otherwise
    // patchEnvFile will treat them as new values even if they already exist.
    fetchedEnv[key] = isSecret ? `""` : value;
  });

  if ((await fileExists(dotEnvPath)) && !force) {
    const existingEnv = await readFile(dotEnvPath);
    const patchedEnv = patchEnvFile(existingEnv, fetchedEnv);

    if (existingEnv === patchedEnv) {
      renderInfo({
        body: `No changes to your ${fileName} file`,
      });
      return;
    }

    const diff = diffLines(existingEnv, patchedEnv);

    const overwrite = await renderConfirmationPrompt({
      confirmationMessage: `Yes, confirm changes`,
      cancellationMessage: `No, make changes later`,
      message: outputContent`We'll make the following changes to your .env file:

${outputToken.linesDiff(diff)}
Continue?`.value,
    });

    if (!overwrite) {
      return;
    }

    await writeFile(dotEnvPath, patchedEnv);
  } else {
    const newEnv = patchEnvFile(null, fetchedEnv);
    await writeFile(dotEnvPath, newEnv);
  }

  const hasSecretVariables = environmentVariables.some(
    ({isSecret}) => isSecret,
  );

  if (hasSecretVariables) {
    const {storefront: configStorefront} = await getConfig(actualPath);

    renderWarning({
      body: `${
        configStorefront!.title
      } contains environment variables marked as secret, so their values weren’t pulled.`,
    });
  }

  renderSuccess({
    body: ['Changes have been made to your', {filePath: fileName}, 'file'],
  });
}
