import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'stream/promises';
import gunzipMaybe from 'gunzip-maybe';
import {extract} from 'tar-fs';
import {fetch} from '@shopify/cli-kit/node/http';
import {parseGitHubRepositoryURL} from '@shopify/cli-kit/node/github';
import {mkdir, fileExists, rmdir} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {getAssetsDir, getSkeletonSourceDir} from './build.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {downloadGitRepository} from '@shopify/cli-kit/node/git';

// Note: this skips pre-releases
const REPO_RELEASES_URL = `https://api.github.com/repos/shopify/hydrogen/releases/latest`;

const getTryMessage = (status: number) =>
  status === 403
    ? `If you are using a VPN, WARP, or similar service, consider disabling it momentarily.`
    : undefined;

async function getLatestReleaseDownloadUrl(signal?: AbortSignal) {
  const response = await fetch(REPO_RELEASES_URL, {signal});
  if (!response.ok || response.status >= 400) {
    throw new AbortError(
      `Failed to fetch the latest release information. Status ${
        response.status
      } ${response.statusText.replace(/\.$/, '')}.`,
      getTryMessage(response.status),
    );
  }

  const release = (await response.json()) as {
    name: string;
    tarball_url: string;
  };

  return {
    // @shopify/package-name@version => package-name@version
    version: release.name.split('/').pop() ?? release.name,
    url: release.tarball_url,
  };
}

async function downloadMonorepoTarball(
  url: string,
  storageDir: string,
  signal?: AbortSignal,
) {
  const response = await fetch(url, {signal});
  if (!response.ok || response.status >= 400) {
    throw new AbortError(
      `Failed to download the latest release files. Status ${response.status} ${response.statusText}}`,
      getTryMessage(response.status),
    );
  }

  await pipeline(
    // Download
    response.body!,
    // Decompress
    gunzipMaybe(),
    // Unpack
    extract(storageDir, {
      strip: 1,
      filter: (name) => {
        name = name.replace(storageDir, '');
        return (
          !name.startsWith(path.normalize('/templates/')) &&
          !name.startsWith(path.normalize('/examples/'))
        );
      },
    }),
  );
}

export async function downloadMonorepoTemplates({
  signal,
}: {signal?: AbortSignal} = {}) {
  if (process.env.LOCAL_DEV) {
    const templatesDir = path.dirname(getSkeletonSourceDir());
    return {
      version: 'local',
      templatesDir,
      examplesDir: path.resolve(templatesDir, '..', 'examples'),
    };
  }

  try {
    const {version, url} = await getLatestReleaseDownloadUrl(signal);
    const templateStoragePath = await getAssetsDir('internal-templates');

    if (!(await fileExists(templateStoragePath))) {
      await mkdir(templateStoragePath);
    }

    const templateStorageVersionPath = path.join(templateStoragePath, version);
    if (!(await fileExists(templateStorageVersionPath))) {
      await downloadMonorepoTarball(url, templateStorageVersionPath, signal);
    }

    return {
      version,
      templatesDir: path.join(templateStorageVersionPath, 'templates'),
      examplesDir: path.join(templateStorageVersionPath, 'examples'),
    };
  } catch (e) {
    const error = e as AbortError;
    throw new AbortError(
      `Could not download Hydrogen templates from GitHub.\nPlease check your internet connection and the following error:\n\n` +
        error.message,
      error.tryMessage,
    );
  }
}

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
