import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import {pipeline} from 'stream/promises';
import type {ReadableStream} from 'stream/web';
import gunzipMaybe from 'gunzip-maybe';
import {extract} from 'tar-fs';

// TODO: Update repo name
// Note: this skips pre-releases
const REPO_RELEASES_URL = `https://api.github.com/repos/shopify/h2/releases/latest`;

export async function getLatestReleaseDownloadUrl() {
  const response = await fetch(REPO_RELEASES_URL);
  if (!response.ok || response.status >= 400) {
    throw new Error(
      `Failed to fetch the latest release information. Status ${response.status} ${response.statusText}}`,
    );
  }

  const release: {name: string; tarball_url: string} = await response.json();

  return {
    // @shopify/package-name@version => package-name@version
    version: release.name.split('/').pop() ?? release.name,
    url: release.tarball_url,
  };
}

export async function downloadTarball(url: string, storageDir: string) {
  const response = await fetch(url);
  if (!response.ok || response.status >= 400) {
    throw new Error(
      `Failed to download the latest release files. Status ${response.status} ${response.statusText}}`,
    );
  }

  await pipeline(
    // Download
    Readable.fromWeb(response.body as ReadableStream),
    // Decompress
    gunzipMaybe(),
    // Unpack
    extract(storageDir, {
      strip: 1,
      filter: (name, header) =>
        !name.replace(storageDir, '').startsWith('/templates/'),
    }),
  );
}

export async function getLatestTemplates() {
  try {
    const {version, url} = await getLatestReleaseDownloadUrl();
    const templateStoragePath = new URL('../starter-templates', import.meta.url)
      .pathname;

    if (!fs.existsSync(templateStoragePath)) {
      fs.mkdirSync(templateStoragePath);
    }

    const templateStorageVersionPath = path.join(templateStoragePath, version);
    if (!fs.existsSync(templateStorageVersionPath)) {
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
