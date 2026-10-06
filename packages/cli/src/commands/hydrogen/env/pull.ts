import {diffLines} from 'diff';
import Command from '../../../lib/hydrogen-command.js';
import {
  renderConfirmationPrompt,
  renderInfo,
  renderWarning,
  renderSuccess,
} from '../../../lib/ui.js';
import {
  outputContent,
  outputInfo,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {fileExists, readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {patchEnvFile} from '@shopify/cli-kit/node/dot-env';
import colors from '@shopify/cli-kit/node/colors';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {login} from '../../../lib/auth.js';
import {getCliCommand} from '../../../lib/shell.js';
import {
  findEnvironmentByBranchOrThrow,
  findEnvironmentOrThrow,
} from '../../../lib/common.js';
import {renderMissingStorefront} from '../../../lib/render-errors.js';
import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

function needsQuoting(value: string): boolean {
  // Check for shell metacharacters that require quoting to prevent parsing errors
  // {} - Brace expansion
  // @ # - Special characters that can break parsing
  // \s - Whitespace (spaces, tabs, newlines)
  // " ' - Quote characters that need escaping
  // \\ - Backslash escape character
  // $ - Variable expansion
  // ` - Command substitution
  // | ; & - Command operators
  // < > - Redirection operators
  // () - Subshell grouping
  // ! ? * - Glob patterns and history expansion
  // [] - Character classes in glob patterns
  // Also check for control characters (0x00-0x1F) and DEL (0x7F)
  return (
    /[{}@#\s"'\\$`|;&<>()!?*\[\]]/.test(value) || /[\x00-\x1F\x7F]/.test(value)
  );
}

function quoteEnvValue(value: string): string {
  if (!needsQuoting(value)) return value;

  // dotenv has no general escape syntax: single-quoted values are fully
  // literal, and double-quoted values only expand `\n` and `\r`. Escaping
  // backslashes or quotes would leave the escape characters in the parsed
  // value, so prefer single quotes. They are also inert if the file is
  // shell-sourced (no `$` or backtick expansion).
  if (!/['\r\n]/.test(value)) return `'${value}'`;

  // Values containing a single quote or line breaks need double quotes so
  // that line breaks can be encoded as `\n` / `\r`. Other characters are
  // written as-is because dotenv does not unescape them.
  return `"${value.replaceAll('\r', '\\r').replaceAll('\n', '\\n')}"`;
}

export default class EnvPull extends Command {
  static descriptionWithMarkdown =
    'Pulls environment variables from the linked Hydrogen storefront and writes them to an `.env` file.';
  static description =
    'Populate your .env with variables from your Hydrogen storefront.';

  static flags = {
    ...commonFlags.env,
    ...commonFlags.envBranch,
    ...commonFlags.envFile,
    ...commonFlags.path,
    ...commonFlags.force,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(EnvPull);
    await runEnvPull({...flagsToCamelObject(flags)});
  }
}

interface EnvPullOptions {
  env?: string;
  envBranch?: string;
  envFile: string;
  force?: boolean;
  path?: string;
}

export async function runEnvPull({
  env: envHandle,
  envBranch,
  path: root = process.cwd(),
  envFile,
  force,
}: EnvPullOptions) {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root),
    getCliCommand(),
  ]);

  const linkedStorefront = await verifyLinkedStorefront({
    root,
    session,
    config,
    cliCommand,
  });

  if (!linkedStorefront) return;

  config.storefront = linkedStorefront;

  if (envHandle || envBranch) {
    const environments =
      (await getStorefrontEnvironments(session, config.storefront.id))
        ?.environments || [];
    if (envHandle) {
      findEnvironmentOrThrow(environments, envHandle);
    } else if (envBranch) {
      envHandle = findEnvironmentByBranchOrThrow(
        environments,
        envBranch,
      ).handle;
    }
  }

  const storefront = await getStorefrontEnvVariables(
    session,
    config.storefront.id,
    envHandle,
  );

  if (!storefront) {
    renderMissingStorefront({
      session,
      storefront: config.storefront,
      cliCommand,
    });

    return;
  }

  if (!storefront.environmentVariables.length) {
    outputInfo(`No environment variables found.`);
    return;
  }

  const variables = storefront.environmentVariables;
  if (!variables.length) return;

  const fileName = colors.whiteBright(envFile);
  const dotEnvPath = resolvePath(root, envFile);
  const fetchedEnv: Record<string, string> = {};

  variables.forEach(({isSecret, key, value}) => {
    // We need to force an empty string for secret variables, otherwise
    // patchEnvFile will treat them as new values even if they already exist.
    fetchedEnv[key] = isSecret ? `""` : quoteEnvValue(value);
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
      message:
        outputContent`We'll make the following changes to your ${fileName} file:

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

  const hasSecretVariables = variables.some(({isSecret}) => isSecret);

  if (hasSecretVariables) {
    renderWarning({
      body: `${config.storefront.title} contains environment variables marked as secret, so their values weren’t pulled.`,
    });
  }

  renderSuccess({
    body: ['Changes have been made to your', {filePath: fileName}, 'file'],
  });
}
