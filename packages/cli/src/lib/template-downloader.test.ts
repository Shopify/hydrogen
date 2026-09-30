import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createGzip} from 'node:zlib';
import {pack} from 'tar-fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fileExists, inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {fetch} from '@shopify/cli-kit/node/http';
import {downloadMonorepoTemplates} from './template-downloader.js';

// The installed CLI's layout: its bundled skeleton and its assets folder.
const installedCli = vi.hoisted(() => ({starterDir: '', assetsDir: ''}));

vi.mock('@shopify/cli-kit/node/http', () => ({fetch: vi.fn()}));
vi.mock('./build.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./build.js')>()),
  getStarterDir: () => installedCli.starterDir,
  getAssetsDir: (feature = '') => join(installedCli.assetsDir, feature),
}));

describe('downloadMonorepoTemplates', () => {
  beforeEach(() => {
    // Tests run inside the monorepo, which otherwise uses local templates.
    vi.stubEnv('FORCE_TEMPLATES_SOURCE', 'remote');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(fetch).mockReset();
  });

  it('downloads the release tagged with the bundled skeleton version', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await useInstalledCli(tmpDir, '2026.4.7');

      const archiveRoot = join(tmpDir, 'archive');
      const templatePath = 'hydrogen-skeleton-2026.4.7/templates/skeleton';
      await mkdir(join(archiveRoot, templatePath), {recursive: true});
      await writeFile(join(archiveRoot, templatePath, 'package.json'), '{}');

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: pack(archiveRoot).pipe(createGzip()),
      } as unknown as Awaited<ReturnType<typeof fetch>>);

      const {templatesDir} = await downloadMonorepoTemplates();

      expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
        'https://github.com/Shopify/hydrogen/archive/refs/tags/skeleton@2026.4.7.tar.gz',
      ]);
      await expect(
        fileExists(join(templatesDir, 'skeleton', 'package.json')),
      ).resolves.toBe(true);
    });
  });

  it('refuses a bundled skeleton version that was never released', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await useInstalledCli(tmpDir, '0.0.0-next-1842c33-20260319170639');

      await expect(downloadMonorepoTemplates()).rejects.toThrow(
        /isn't a released version/,
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});

async function useInstalledCli(tmpDir: string, skeletonVersion: string) {
  installedCli.starterDir = join(tmpDir, 'starter');
  installedCli.assetsDir = join(tmpDir, 'assets');

  await mkdir(installedCli.starterDir, {recursive: true});
  await mkdir(installedCli.assetsDir, {recursive: true});
  await writeFile(
    join(installedCli.starterDir, 'package.json'),
    JSON.stringify({name: 'skeleton', version: skeletonVersion}),
  );
}
