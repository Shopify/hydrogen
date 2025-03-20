import {execSync} from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {COOKBOOK_PATH, REPO_ROOT, TEMPLATE_PATH} from './constants';

/**
 * Get the description of a step.
 * @param file - The file to get the description from.
 * @param type - The type of step to get the description from.
 * @returns The description of the step or null if the description is not found or it's empty.
 */
export function getStepDescription(
  file: string,
  type: 'patch' | 'ingredient',
): string | null {
  const content = fs.readFileSync(file, 'utf-8');
  // if the description is not found or it's empty, return null. If there are multiple descriptions, concatenate them with a period. There can be multiple @description tags in the file.
  // if the type is patch, the description must be found on a line that is either new or has been modified (so it starts with a +)
  function getMatch(): string[] | null {
    switch (type) {
      case 'patch':
        return content.trim().match(/\+.+@description\s+(.*)/g);
      case 'ingredient':
        return content.trim().match(/.+@description\s+(.*)/g);
      default:
        assertNever(type);
    }
  }
  const match = getMatch();
  if (!match) {
    return null;
  }

  // Concatenate the descriptions so they look like a single description. If the description ends with a period, don't add another period.
  const lines = match.map(
    (m) =>
      m
        .replace(/.+@description\s+/, '')
        .replace(/\*\/\s*\}?$/, '') // remove trailing `*/`
        .trim()
        .replace(/\.*$/, '') + '.',
  );

  if (lines.length === 0) {
    return null;
  }

  if (lines.length > 1) {
    return lines.map((line) => `- ${line}`).join('\n');
  }

  return lines[0];
}

export function createDirectoryIfNotExists(dir: string) {
  try {
    fs.mkdirSync(dir, {recursive: true});
  } catch (error) {
    if (!isFSError(error, 'EEXIST')) {
      throw error;
    }
  }
}

export function recreateDirectory(dir: string) {
  try {
    fs.rmSync(dir, {recursive: true});
  } catch (error) {
    if (!isFSError(error, 'ENOENT')) {
      throw error;
    }
  }
  createDirectoryIfNotExists(dir);
}

function isFSError(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

/**
 * Parse the git status of the template directory.
 * @param params - The parameters for the git status.
 * @returns The modified, new, and deleted files.
 */
export function parseGitStatus(params: {filenamesToIgnore: string[]}): {
  modifiedFiles: string[];
  newFiles: string[];
  deletedFiles: string[];
} {
  const status = execSync(`git status --porcelain '${TEMPLATE_PATH}'`);

  let modifiedFiles: string[] = [];
  let newFiles: string[] = [];
  let deletedFiles: string[] = [];

  for (const line of status.toString().split('\n')) {
    const tokens = line.trim().split(/\s+/, 2);
    if (tokens.length < 2) {
      continue;
    }
    const [status, file] = tokens;

    if (params.filenamesToIgnore.includes(path.basename(file))) {
      continue;
    }

    if (status === 'D') {
      deletedFiles.push(file);
      continue;
    }

    // if the file is a directory, expand the status to include all the files in the directory
    if (fs.statSync(path.join(REPO_ROOT, file)).isDirectory()) {
      if (status === '??') {
        // list the files in the directory, recursively
        const files = fs.readdirSync(path.join(REPO_ROOT, file), {
          withFileTypes: true,
          recursive: true,
        });
        for (const f of files) {
          if (f.isDirectory()) {
            continue;
          }
          newFiles.push(
            path.join(f.parentPath.replace(REPO_ROOT + '/', ''), f.name),
          );
        }
      }
    } else {
      switch (status) {
        case 'M':
          modifiedFiles.push(file);
          break;
        case '??':
          newFiles.push(file);
          break;
        default:
          console.warn('unknown git status symbol', status);
      }
    }
  }

  return {modifiedFiles, newFiles, deletedFiles};
}

export function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel').toString().trim();
}

export function separator(): string {
  return '-'.repeat(process.stdout.columns) + '\n';
}

export function getMainCommitHash(params: {
  remote?: string;
  branch: string;
}): string {
  if (params.remote != null) {
    execSync(`git fetch ${params.remote} ${params.branch}`);
  }
  return execSync(
    `git rev-parse ${params.remote != null ? `${params.remote}/` : ''}${
      params.branch
    }`,
  )
    .toString()
    .trim();
}

export function parseReferenceBranch(referenceBranch: string): {
  remote?: string;
  branch: string;
} {
  const remotes = execSync(`git remote -v`)
    .toString()
    .trim()
    .split('\n')
    .map((r) => r.trim().split(/\s+/, 2)[0]);

  const tokens = referenceBranch.split('/');
  if (tokens.length > 1) {
    const maybeRemote = remotes.find((r) => r === tokens[0]);
    if (maybeRemote != null) {
      return {remote: maybeRemote, branch: tokens.slice(1).join('/')};
    }
  }
  return {branch: referenceBranch};
}

export function assertNever(n: never): never {
  throw new Error('Expected `never`, got ' + JSON.stringify(n));
}

export function makeRandomTempDir(params: {prefix: string}): string {
  const dir = path.join(
    os.tmpdir(),
    `${params.prefix}-${crypto.randomUUID().toString()}`,
  );
  createDirectoryIfNotExists(dir);
  return dir;
}

export function listRecipes(): string[] {
  const recipesFolder = path.join(COOKBOOK_PATH, 'recipes');
  return fs
    .readdirSync(recipesFolder, {withFileTypes: true})
    .filter((file) => {
      return file.isDirectory();
    })
    .filter((file) => {
      return fs.existsSync(path.join(recipesFolder, file.name, 'recipe.json'));
    })
    .map((file) => file.name);
}

export function isInGitHistory(params: {path: string}): boolean {
  const status = execSync(`git log ${params.path} | wc -l`);
  const count = parseInt(status.toString().trim());
  return count > 0;
}

export function getPatchesDir(recipeName: string): string {
  return path.join(COOKBOOK_PATH, 'recipes', recipeName, 'patches');
}

export type SkipPrompts = 'yes' | 'no';
