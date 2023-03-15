import Command from '@shopify/cli-kit/node/base-command';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {output} from '@shopify/cli-kit';
import {execSync} from 'child_process';
import {
  hasAlias,
  homeFileExists,
  isGitBash,
  isWindows,
  shellWriteFile,
  supportsShell,
  type Shell,
  type UnixShell,
  type WindowsShell,
} from '../../utils/shell.js';

const ALIAS_NAME = 'h2';

export default class GenerateRoute extends Command {
  static description = `Creates a global \`${ALIAS_NAME}\` shortcut for the Hydrogen CLI`;

  async run(): Promise<void> {
    await runCreateShortcut();
  }
}

export async function runCreateShortcut() {
  const shortcuts: Array<Shell> =
    isWindows() && !isGitBash() // Check Mintty/Mingw/Cygwin
      ? await createShortcutsForWindows() // Windows without Git Bash
      : await createShortcutsForUnix(); // Unix and Windows with Git Bash

  if (shortcuts.length > 0) {
    renderSuccess({
      headline: `Shortcut ready for the following shells: ${shortcuts.join(
        ', ',
      )}.\nRestart your terminal session and run \`${ALIAS_NAME}\` from your local project.`,
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

const BASH_ZSH_COMMAND = `alias ${ALIAS_NAME}='$(npm bin -s)/shopify hydrogen'`;
const BASH_ZSH_COMMAND_WINDOWS = `alias ${ALIAS_NAME}='$(npm prefix -s)/node_modules/.bin/shopify hydrogen'`;

const FISH_FUNCTION = `
function ${ALIAS_NAME} --wraps='shopify hydrogen' --description 'Shortcut for the Hydrogen CLI'
   set npmBin (npm bin -s)
   \\$npmBin/shopify hydrogen \\$argv
end
`;

async function createShortcutsForUnix() {
  const shells: UnixShell[] = [];

  const ALIAS_COMMAND = isWindows()
    ? BASH_ZSH_COMMAND_WINDOWS
    : BASH_ZSH_COMMAND;

  if (supportsShell('zsh')) {
    try {
      if (!hasAlias(ALIAS_NAME, '~/.zshrc')) {
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
      if (!hasAlias(ALIAS_NAME, '~/.bashrc')) {
        shellWriteFile('~/.bashrc', ALIAS_COMMAND, true);
      }
      shells.push('bash');
    } catch (error) {
      output.debug(
        'Could not create alias for Bash:\n' + (error as Error).stack,
      );
    }
  }

  if (
    supportsShell('fish') &&
    (await homeFileExists('~/.config/fish/functions'))
  ) {
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

// Create a PS function and and alias to call it.
const PS_FUNCTION = `function Invoke-Local-H2 {$npmBin = npm prefix -s; Invoke-Expression "$npmBin\\node_modules\\.bin\\shopify.ps1 hydrogen $Args"}; Set-Alias -Name ${ALIAS_NAME} -Value Invoke-Local-H2`;

// Add the previous function and alias to the user's profile if they don't already exist.
const PS_APPEND_PROFILE_COMMAND = `
if (!(Test-Path -Path $PROFILE)) {
  New-Item -ItemType File -Path $PROFILE -Force
}

$profileContent = Get-Content -Path $PROFILE
if (!$profileContent -or $profileContent -NotLike '*Invoke-Local-H2*') {
  Add-Content -Path $PROFILE -Value '${PS_FUNCTION}'
}
`;

async function createShortcutsForWindows() {
  const shells: WindowsShell[] = [];

  try {
    // Legacy PowerShell
    execSync(PS_APPEND_PROFILE_COMMAND, {
      shell: 'powershell.exe',
      stdio: 'ignore',
    });
    shells.push('PowerShell');
  } catch (error) {
    output.debug(
      'Could not create alias for PowerShell:\n' + (error as Error).stack,
    );
  }

  try {
    // PowerShell 7+ has a different executable name and installation path:
    // https://learn.microsoft.com/en-us/powershell/scripting/whats-new/migrating-from-windows-powershell-51-to-powershell-7?view=powershell-7.3#separate-installation-path-and-executable-name
    execSync(PS_APPEND_PROFILE_COMMAND, {shell: 'pwsh.exe', stdio: 'ignore'});
    shells.push('PowerShell 7+');
  } catch (error) {
    output.debug(
      'Could not create alias for PowerShell 7+:\n' + (error as Error).stack,
    );
  }

  // TODO: support CMD?

  return shells;
}
