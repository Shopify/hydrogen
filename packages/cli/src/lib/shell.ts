import os from 'node:os';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {execAsync} from './process.js';

export type UnixShell = 'zsh' | 'bash' | 'fish';
export type WindowsShell = 'PowerShell' | 'PowerShell 7+' | 'CMD';
export type Shell = UnixShell | WindowsShell;

export const ALIAS_NAME = 'h2';

export const isWindows = () => process.platform === 'win32';
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
  try {
    const filepath = getShellAliasDefinitionFile(shell);

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
