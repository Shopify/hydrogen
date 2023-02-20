import path from 'path';
import {pipeline} from 'stream/promises';
import gunzipMaybe from 'gunzip-maybe';
import {extract} from 'tar-fs';
import {http, file} from '@shopify/cli-kit';
import {fileURLToPath} from 'url';

// Note: this skips pre-releases
const REPO_RELEASES_URL = `https://api.github.com/repos/shopify/hydrogen/releases/latest`;

export async function getLatestReleaseDownloadUrl() {
  const response = await http.fetch(REPO_RELEASES_URL);
  if (!response.ok || response.status >= 400) {
    throw new Error(
      `Failed to fetch the latest release information. Status ${
        response.status
      } ${response.statusText.replace(/\.$/, '')}.` +
        (response.status === 403
          ? `\n\nIf you are using a VPN, WARP, or similar service, consider disabling it momentarily.`
          : ''),
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

export async function downloadTarball(url: string, storageDir: string) {
  const response = await http.fetch(url);
  if (!response.ok || response.status >= 400) {
    throw new Error(
      `Failed to download the latest release files. Status ${response.status} ${response.statusText}}`,
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

    if (!(await file.exists(templateStoragePath))) {
      await file.mkdir(templateStoragePath);
    }

    const templateStorageVersionPath = path.join(templateStoragePath, version);
    if (!(await file.exists(templateStorageVersionPath))) {
      await downloadTarball(url, templateStorageVersionPath);
    }

    return {
      version,
      templatesDir: path.join(templateStorageVersionPath, 'templates'),
    };
  } catch (e) {
    const error = e as Error;
    error.message =
      `Could not download Hydrogen templates from GitHub.\nPlease check your internet connection and the following error:\n\n` +
      error.message;

    throw error;
  }
}
