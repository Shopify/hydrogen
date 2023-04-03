import os from 'os';
import path from 'path';
import {execSync} from 'child_process';
import {file, output} from '@shopify/cli-kit';

export type UnixShell = 'zsh' | 'bash' | 'fish';
export type WindowsShell = 'PowerShell' | 'PowerShell 7+' | 'CMD';
export type Shell = UnixShell | WindowsShell;

export const isWindows = () => process.platform === 'win32';
export const isGitBash = () => !!process.env.MINGW_PREFIX; // Check Mintty/Mingw/Cygwin

function resolveFromHome(filepath: string) {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }

  return filepath;
}

export function homeFileExists(filepath: string) {
  try {
    return file.exists(resolveFromHome(filepath));
  } catch (error) {
    return false;
  }
}

export function supportsShell(shell: UnixShell) {
  try {
    execSync(`which ${shell}`, {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

export function hasAlias(aliasName: string, filepath: string) {
  try {
    const result = execSync(
      `grep 'alias ${aliasName}' ${resolveFromHome(filepath)}`,
      {stdio: 'pipe'},
    ).toString();
    return !!result;
  } catch {
    return false;
  }
}

export function shellWriteFile(
  filepath: string,
  content: string,
  append = false,
) {
  content = `"${content}"`;
  content = content.replaceAll('\n', '\\n');
  if (!isWindows()) {
    content = content.replaceAll('$', '\\$');
  }

  try {
    execSync(
      `printf ${content} ${append ? '>>' : '>'} ${resolveFromHome(filepath)}`,
    );
    return true;
  } catch (error) {
    output.debug(
      `Could not create or modify ${filepath}:\n` + (error as Error).stack,
    );
    return false;
  }
}

export function shellRunScript(script: string, shellBin: string) {
  try {
    execSync(script, {shell: shellBin, stdio: 'ignore'});
    return true;
  } catch (error) {
    output.debug(
      `Could not run shell script for ${shellBin}:\n` + (error as Error).stack,
    );
    return false;
  }
}
