import {execSync} from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {COOKBOOK_PATH, REPO_ROOT, TEMPLATE_PATH} from './constants';

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

  let filesWithUnknownStatuses: string[] = [];

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
          filesWithUnknownStatuses.push(file);
      }
    }
  }

  if (filesWithUnknownStatuses.length > 0) {
    // unique statuses
    console.warn(
      '⚠️ All files in the template directory must not be staged for commit. Please review the following files and stage them manually:',
    );
    console.warn(filesWithUnknownStatuses.map((f) => `- ${f}`).join('\n'));
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
  try {
    execSync(`git ls-files --error-unmatch ${params.path}`);
    return true;
  } catch (_) {
    return false;
  }
}

export function getPatchesDir(recipeName: string): string {
  return path.join(COOKBOOK_PATH, 'recipes', recipeName, 'patches');
}

export type SkipPrompts = 'yes' | 'no';

export type RecipeManifestFormat = 'json' | 'yaml';
