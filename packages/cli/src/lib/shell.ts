import os from 'node:os';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {execAsync} from './process.js';

export type UnixShell = 'zsh' | 'bash' | 'fish';
export type WindowsShell = 'PowerShell' | 'PowerShell 7+' | 'CMD';
export type Shell = UnixShell | WindowsShell;

export const ALIAS_NAME = 'h2';

export const isWindows = () => os.platform() === 'win32';
export const isGitBash = () => !!process.env.MINGW_PREFIX; // Check Mintty/Mingw/Cygwin

function resolveFromHome(filepath: string) {
  if (filepath[0] === '~') {
    return joinPath(os.homedir(), filepath.slice(1));
  }

  return filepath;
}

function homeFileExists(filepath: string) {
  try {
    return fileExists(resolveFromHome(filepath));
  } catch (error) {
    return false;
  }
}

async function supportsShell(shell: UnixShell) {
  try {
    await execAsync(`which ${shell}`);
    return true;
  } catch {
    return false;
  }
}

function getShellAliasDefinitionFile(shell: UnixShell) {
  if (shell === 'bash') return '~/.bashrc';
  if (shell === 'zsh') return '~/.zshrc';
  return `~/.config/fish/functions/${ALIAS_NAME}.fish`;
}

async function hasAliasDefinition(aliasName: string, shell: UnixShell) {
  const filepath = getShellAliasDefinitionFile(shell);

  try {
    if (shell === 'fish') {
      return await homeFileExists(filepath);
    }

    const result = await execAsync(
      `grep 'alias ${aliasName}' ${resolveFromHome(filepath)}`,
    );
    return !!result.stdout;
  } catch {
    return false;
  }
}

async function shellWriteFile(
  shell: UnixShell,
  content: string,
  append = false,
) {
  const filepath = getShellAliasDefinitionFile(shell);

  content = `"${content}"`;
  content = content.replaceAll('\n', '\\n');
  if (!isWindows()) {
    content = content.replaceAll('$', '\\$');
  }

  try {
    await execAsync(
      `printf ${content} ${append ? '>>' : '>'} ${resolveFromHome(filepath)}`,
    );
    return true;
  } catch (error) {
    outputDebug(
      `Could not create or modify ${filepath}:\n` + (error as Error).stack,
    );
    return false;
  }
}

export async function shellWriteAlias(
  shell: UnixShell,
  aliasName: string,
  content: string,
) {
  if (!(await supportsShell(shell))) return false;
  if (await hasAliasDefinition(aliasName, shell)) return true;

  return await shellWriteFile(shell, content, shell !== 'fish');
}

export async function shellRunScript(script: string, shellBin: string) {
  try {
    await execAsync(script, {shell: shellBin});
    return true;
  } catch (error) {
    outputDebug(
      `Could not run shell script for ${shellBin}:\n` + (error as Error).stack,
    );
    return false;
  }
}

function isKnownUnixShell(shell: string): shell is UnixShell {
  return ['zsh', 'bash', 'fish'].includes(shell);
}

async function hasCliAlias() {
  try {
    if (isWindows() && !isGitBash()) {
      await execAsync(`Get-Alias -Name ${ALIAS_NAME}`);
    } else {
      const shell = defaultUnixShell();
      if (!isKnownUnixShell(shell)) return false;

      return await hasAliasDefinition(ALIAS_NAME, shell);
    }

    return true;
  } catch {
    return false;
  }
}

function defaultUnixShell() {
  let detectedShell: UnixShell;
  try {
    detectedShell = os.userInfo().shell?.split('/').pop() ?? 'bash';
  } catch {
    try {
      detectedShell = process.env.SHELL?.split('/').pop() ?? 'bash';
    } catch {
      detectedShell = 'bash';
    }
  }
  return detectedShell;
}

export async function createPlatformShortcut() {
  const shortcuts =
    isWindows() && !isGitBash()
      ? await createShortcutsForWindows() // Windows without Git Bash
      : await createShortcutsForUnix(); // Unix and Windows with Git Bash

  return shortcuts;
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

export async function getCliCommand(
  directory = process.cwd(),
  forcePkgManager?: 'npm' | 'pnpm' | 'yarn',
) {
  if (!forcePkgManager && (await hasCliAlias())) {
    return ALIAS_NAME;
  }

  let cli: 'npx' | 'pnpm' | 'yarn' = 'npx';
  const pkgManager =
    forcePkgManager ?? (await getPackageManager(directory).catch(() => null));

  if (pkgManager === 'pnpm' || pkgManager === 'yarn') cli = pkgManager;

  return `${cli} shopify hydrogen` as const;
}

export type CliCommand = Awaited<ReturnType<typeof getCliCommand>>;
