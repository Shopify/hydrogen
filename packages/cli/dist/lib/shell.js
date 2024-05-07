import os from 'node:os';
import { fileExists } from '@shopify/cli-kit/node/fs';
import { joinPath } from '@shopify/cli-kit/node/path';
import { outputDebug } from '@shopify/cli-kit/node/output';
import { getPackageManager } from '@shopify/cli-kit/node/node-package-manager';
import { execAsync } from './process.js';

const ALIAS_NAME = "h2";
const isWindows = () => os.platform() === "win32";
const isGitBash = () => !!process.env.MINGW_PREFIX;
function resolveFromHome(filepath) {
  if (filepath[0] === "~") {
    return joinPath(os.homedir(), filepath.slice(1));
  }
  return filepath;
}
function homeFileExists(filepath) {
  try {
    return fileExists(resolveFromHome(filepath));
  } catch (error) {
    return false;
  }
}
async function supportsShell(shell) {
  try {
    await execAsync(`which ${shell}`);
    return true;
  } catch {
    return false;
  }
}
function getShellAliasDefinitionFile(shell) {
  if (shell === "bash")
    return "~/.bashrc";
  if (shell === "zsh")
    return "~/.zshrc";
  return `~/.config/fish/functions/${ALIAS_NAME}.fish`;
}
async function hasAliasDefinition(aliasName, shell) {
  const filepath = getShellAliasDefinitionFile(shell);
  try {
    if (shell === "fish") {
      return await homeFileExists(filepath);
    }
    const result = await execAsync(
      `grep 'alias ${aliasName}' ${resolveFromHome(filepath)}`
    );
    return !!result.stdout;
  } catch {
    return false;
  }
}
async function shellWriteFile(shell, content, append = false) {
  const filepath = getShellAliasDefinitionFile(shell);
  content = `"${content}"`;
  content = content.replaceAll("\n", "\\n");
  if (!isWindows()) {
    content = content.replaceAll("$", "\\$");
  }
  try {
    await execAsync(
      `printf ${content} ${append ? ">>" : ">"} ${resolveFromHome(filepath)}`
    );
    return true;
  } catch (error) {
    outputDebug(
      `Could not create or modify ${filepath}:
` + error.stack
    );
    return false;
  }
}
async function shellWriteAlias(shell, aliasName, content) {
  if (!await supportsShell(shell))
    return false;
  if (await hasAliasDefinition(aliasName, shell))
    return true;
  return await shellWriteFile(shell, content, shell !== "fish");
}
async function shellRunScript(script, shellBin) {
  try {
    await execAsync(script, { shell: shellBin });
    return true;
  } catch (error) {
    outputDebug(
      `Could not run shell script for ${shellBin}:
` + error.stack
    );
    return false;
  }
}
function isKnownUnixShell(shell) {
  return ["zsh", "bash", "fish"].includes(shell);
}
async function hasCliAlias() {
  try {
    if (isWindows() && !isGitBash()) {
      await execAsync(`Get-Alias -Name ${ALIAS_NAME}`);
    } else {
      const shell = os.userInfo().shell?.split("/").pop() ?? "bash";
      if (!isKnownUnixShell(shell))
        return false;
      return await hasAliasDefinition(ALIAS_NAME, shell);
    }
    return true;
  } catch {
    return false;
  }
}
async function createPlatformShortcut() {
  const shortcuts = isWindows() && !isGitBash() ? await createShortcutsForWindows() : await createShortcutsForUnix();
  return shortcuts;
}
const BASH_ZSH_COMMAND = `
# Shopify Hydrogen alias to local projects
alias ${ALIAS_NAME}='$(npm prefix -s)/node_modules/.bin/shopify hydrogen'
`;
const FISH_FUNCTION = `
function ${ALIAS_NAME} --wraps='shopify hydrogen' --description 'Shortcut for the Hydrogen CLI'
   set npmPrefix (npm prefix -s)
   $npmPrefix/node_modules/.bin/shopify hydrogen $argv
end
`;
async function createShortcutsForUnix() {
  const shells = [];
  if (await shellWriteAlias("zsh", ALIAS_NAME, BASH_ZSH_COMMAND)) {
    shells.push("zsh");
  }
  if (await shellWriteAlias("bash", ALIAS_NAME, BASH_ZSH_COMMAND)) {
    shells.push("bash");
  }
  if (await shellWriteAlias("fish", ALIAS_NAME, FISH_FUNCTION)) {
    shells.push("fish");
  }
  return shells;
}
const PS_FUNCTION = `function Invoke-Local-H2 {$npmPrefix = npm prefix -s; Invoke-Expression "$npmPrefix\\node_modules\\.bin\\shopify.ps1 hydrogen $Args"}; Set-Alias -Name ${ALIAS_NAME} -Value Invoke-Local-H2`;
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
  const shells = [];
  if (await shellRunScript(PS_APPEND_PROFILE_COMMAND, "powershell.exe")) {
    shells.push("PowerShell");
  }
  if (await shellRunScript(PS_APPEND_PROFILE_COMMAND, "pwsh.exe")) {
    shells.push("PowerShell 7+");
  }
  return shells;
}
async function getCliCommand(directory = process.cwd(), forcePkgManager) {
  if (await hasCliAlias()) {
    return ALIAS_NAME;
  }
  let cli = "npx";
  const pkgManager = forcePkgManager ?? await getPackageManager(directory).catch(() => null);
  if (pkgManager === "bun" || pkgManager === "pnpm" || pkgManager === "yarn")
    cli = pkgManager;
  return `${cli} shopify hydrogen`;
}

export { ALIAS_NAME, createPlatformShortcut, getCliCommand, isGitBash, isWindows, shellRunScript, shellWriteAlias };
