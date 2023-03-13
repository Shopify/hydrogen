import Command from '@shopify/cli-kit/node/base-command';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {file, output} from '@shopify/cli-kit';
import {execSync} from 'child_process';
import path from 'path';
import os from 'os';

type UnixShell = 'zsh' | 'bash' | 'fish';

const ALIAS_NAME = 'h2';

export default class GenerateRoute extends Command {
  static description = `Creates a global \`${ALIAS_NAME}\` shortcut for the Hydrogen CLI`;

  async run(): Promise<void> {
    await runCreateShortcut();
  }
}

const IS_WINDOWS = process.platform === 'win32';

export async function runCreateShortcut() {
  const shortcuts: Array<UnixShell> =
    IS_WINDOWS && !process.env.MINGW_PREFIX
      ? await createShortcutsForWindows()
      : await createShortcutsForUnix();

  if (shortcuts.length > 0) {
    renderSuccess({
      headline: `Shortcut ready for the following shells: ${shortcuts.join(
        ', ',
      )}.\nRestart your terminal session and you can run \`${ALIAS_NAME}\` from your local project.`,
    });
  } else {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'No supported shell found.',
      tryMessage: 'Please create a shortcut manually.',
    });
  }
}

function fileExists(filepath: string) {
  try {
    return file.exists(resolveFromHome(filepath));
  } catch (error) {
    return false;
  }
}
function resolveFromHome(filepath: string) {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }

  return filepath;
}

function hasAlias(filepath: string) {
  try {
    const result = execSync(
      `grep 'alias ${ALIAS_NAME}' ${resolveFromHome(filepath)}`,
      {stdio: 'pipe'},
    ).toString();
    return !!result;
  } catch {
    return false;
  }
}

function supportsShell(shell: UnixShell) {
  try {
    execSync(`which ${shell}`, {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

const BASH_ZSH_COMMAND = `alias ${ALIAS_NAME}='$(npm bin -s)/shopify hydrogen'`;
const BASH_ZSH_COMMAND_WINDOWS = `alias ${ALIAS_NAME}='$(npm prefix -s)/node_modules/.bin/shopify hydrogen'`;

const FISH_FUNCTION = `
function ${ALIAS_NAME} --wraps='shopify hydrogen' --description 'Shortcut for the Hydrogen CLI'
   set npmBin (npm bin -s)
   \\$npmBin/shopify hydrogen \\$argv
end
`;

function shellWriteFile(filepath: string, content: string, append = false) {
  return execSync(
    `echo ${content} ${append ? '>>' : '>'} ${resolveFromHome(filepath)}`,
  );
}

async function createShortcutsForUnix() {
  const shells: UnixShell[] = [];

  const ALIAS_COMMAND = IS_WINDOWS
    ? BASH_ZSH_COMMAND_WINDOWS
    : BASH_ZSH_COMMAND;

  if (supportsShell('zsh')) {
    try {
      if (!hasAlias('~/.zshrc')) {
        shellWriteFile('~/.zshrc', ALIAS_COMMAND, true);
      }
      shells.push('zsh');
    } catch (error) {
      output.debug(
        'Could not create alias for ZSH:\n' + (error as Error).stack,
      );
    }
  }

  if (supportsShell('bash')) {
    try {
      if (!hasAlias('~/.bashrc')) {
        shellWriteFile('~/.bashrc', ALIAS_COMMAND, true);
      }
      shells.push('bash');
    } catch (error) {
      output.debug(
        'Could not create alias for Bash:\n' + (error as Error).stack,
      );
    }
  }

  if (supportsShell('fish') && (await fileExists('~/.config/fish/functions'))) {
    try {
      shellWriteFile(
        `~/.config/fish/functions/${ALIAS_NAME}.fish`,
        FISH_FUNCTION,
      );
      shells.push('fish');
    } catch (error) {
      output.debug(
        'Could not create alias for Fish:\n' + (error as Error).stack,
      );
    }
  }

  return shells;
}

async function createShortcutsForWindows() {
  // TODO: Support PowerShell and CMD?
  return [];
}
