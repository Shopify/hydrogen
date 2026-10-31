import {parseGitHubRepositoryURL} from '@shopify/cli-kit/node/github';
import {mkdir, fileExists, rmdir} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {getAssetsDir} from './build.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {downloadGitRepository} from '@shopify/cli-kit/node/git';

export async function downloadExternalRepo(
  appTemplate: string,
  signal: AbortSignal,
) {
  const parsed = parseGitHubRepositoryURL(appTemplate);
  if (parsed.isErr()) {
    throw new AbortError(parsed.error.message);
  }

  const templateStoragePath = await getAssetsDir('external-templates');
  if (!(await fileExists(templateStoragePath))) {
    await mkdir(templateStoragePath);
  }

  const result = parsed.value;
  const templateDir = joinPath(
    templateStoragePath,
    result.full.replace(/^https?:\/\//, '').replace(/[^\w]+/, '_'),
  );

  if (await fileExists(templateDir)) {
    await rmdir(templateDir, {force: true});
  }

  // TODO use AbortSignal?
  await downloadGitRepository({
    repoUrl: result.full,
    destination: templateDir,
    shallow: true,
  });

  await rmdir(joinPath(templateDir, '.git'), {force: true});

  return {templateDir};
}
