import Command from '@shopify/cli-kit/node/base-command';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {
  isGitBash,
  isWindows,
  ALIAS_NAME,
  shellRunScript,
  shellWriteAlias,
  type Shell,
  type UnixShell,
  type WindowsShell,
} from '../../lib/shell.js';

export default class Shortcut extends Command {
  static description = `Creates a global \`${ALIAS_NAME}\` shortcut for the Hydrogen CLI`;

  async run(): Promise<void> {
    await runCreateShortcut();
  }
}

export async function runCreateShortcut() {
  const shortcuts: Array<Shell> =
    isWindows() && !isGitBash()
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

const BASH_ZSH_COMMAND = `
# Shopify Hydrogen alias to local projects
alias ${ALIAS_NAME}='$(npm prefix -s)/node_modules/.bin/shopify hydrogen'`;

const FISH_FUNCTION = `
function ${ALIAS_NAME} --wraps='shopify hydrogen' --description 'Shortcut for the Hydrogen CLI'
   set npmPrefix (npm prefix -s)
   $npmPrefix/node_modules/.bin/shopify hydrogen $argv
end
`;

async function createShortcutsForUnix() {
  const shells: UnixShell[] = [];

  if (await shellWriteAlias('zsh', ALIAS_NAME, BASH_ZSH_COMMAND)) {
    shells.push('zsh');
  }

  if (await shellWriteAlias('bash', ALIAS_NAME, BASH_ZSH_COMMAND)) {
    shells.push('bash');
  }

  if (await shellWriteAlias('fish', ALIAS_NAME, FISH_FUNCTION)) {
    shells.push('fish');
  }

  return shells;
}

// Create a PowerShell function and an alias to call it.
const PS_FUNCTION = `function Invoke-Local-H2 {$npmPrefix = npm prefix -s; Invoke-Expression "$npmPrefix\\node_modules\\.bin\\shopify.ps1 hydrogen $Args"}; Set-Alias -Name ${ALIAS_NAME} -Value Invoke-Local-H2`;

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

  // Legacy PowerShell
  if (await shellRunScript(PS_APPEND_PROFILE_COMMAND, 'powershell.exe')) {
    shells.push('PowerShell');
  }

  // PowerShell 7+ has a different executable name and installation path:
  // https://learn.microsoft.com/en-us/powershell/scripting/whats-new/migrating-from-windows-powershell-51-to-powershell-7?view=powershell-7.3#separate-installation-path-and-executable-name
  if (await shellRunScript(PS_APPEND_PROFILE_COMMAND, 'pwsh.exe')) {
    shells.push('PowerShell 7+');
  }

  // TODO: support CMD?

  return shells;
}
