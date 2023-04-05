import path from 'path';
import {pipeline} from 'stream/promises';
import gunzipMaybe from 'gunzip-maybe';
import {extract} from 'tar-fs';
import {fetch} from '@shopify/cli-kit/node/http';
import {mkdir, fileExists} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {fileURLToPath} from 'url';

// Note: this skips pre-releases
const REPO_RELEASES_URL = `https://api.github.com/repos/shopify/hydrogen/releases/latest`;

const getTryMessage = (status: number) =>
  status === 403
    ? `If you are using a VPN, WARP, or similar service, consider disabling it momentarily.`
    : undefined;

async function getLatestReleaseDownloadUrl() {
  const response = await fetch(REPO_RELEASES_URL);
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

async function downloadTarball(url: string, storageDir: string) {
  const response = await fetch(url);
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
          !name.startsWith(path.normalize('/templates/')) ||
          name.startsWith(path.normalize('/templates/skeleton/'))
        );
      },
    }),
  );
}

export async function getLatestTemplates() {
  try {
    const {version, url} = await getLatestReleaseDownloadUrl();
    const templateStoragePath = fileURLToPath(
      new URL('../starter-templates', import.meta.url),
    );

    if (!(await fileExists(templateStoragePath))) {
      await mkdir(templateStoragePath);
    }

    const templateStorageVersionPath = path.join(templateStoragePath, version);
    if (!(await fileExists(templateStorageVersionPath))) {
      await downloadTarball(url, templateStorageVersionPath);
    }

    return {
      version,
      templatesDir: path.join(templateStorageVersionPath, 'templates'),
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
