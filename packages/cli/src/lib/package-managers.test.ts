import {describe, it, expect} from 'vitest';
import {inTemporaryDirectory, writeFile, mkdir} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {findPackageManagerByLockfile} from './package-managers.js';

describe('findPackageManagerByLockfile()', () => {
  it('detects a lockfile in the directory itself (single-repo)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await writeFile(joinPath(tmpDir, 'pnpm-lock.yaml'), '');

      await expect(findPackageManagerByLockfile(tmpDir)).resolves.toBe('pnpm');
    });
  });

  it('walks up to an ancestor lockfile (monorepo workspace root)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const appDir = joinPath(tmpDir, 'apps', 'storefront');
      await mkdir(appDir);
      await writeFile(joinPath(tmpDir, 'pnpm-lock.yaml'), '');

      await expect(findPackageManagerByLockfile(appDir)).resolves.toBe('pnpm');
    });
  });

  it('detects yarn workspaces via an ancestor yarn.lock', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const appDir = joinPath(tmpDir, 'apps', 'storefront');
      await mkdir(appDir);
      await writeFile(joinPath(tmpDir, 'yarn.lock'), '');

      await expect(findPackageManagerByLockfile(appDir)).resolves.toBe('yarn');
    });
  });

  it('detects bun workspaces via an ancestor bun.lockb', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const appDir = joinPath(tmpDir, 'apps', 'storefront');
      await mkdir(appDir);
      await writeFile(joinPath(tmpDir, 'bun.lockb'), '');

      await expect(findPackageManagerByLockfile(appDir)).resolves.toBe('bun');
    });
  });

  it('prefers the nearest lockfile (app dir beats ancestor)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const appDir = joinPath(tmpDir, 'apps', 'storefront');
      await mkdir(appDir);
      await writeFile(joinPath(tmpDir, 'pnpm-lock.yaml'), '');
      await writeFile(joinPath(appDir, 'package-lock.json'), '');

      await expect(findPackageManagerByLockfile(appDir)).resolves.toBe('npm');
    });
  });

  it('resolves "unknown" when no lockfile exists anywhere', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      // stopAt keeps the walk hermetic against lockfiles above the OS temp dir
      await expect(
        findPackageManagerByLockfile(tmpDir, {stopAt: tmpDir}),
      ).resolves.toBe('unknown');
    });
  });

  it('detects bun.lock (text-based alternative lockfile)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await writeFile(joinPath(tmpDir, 'bun.lock'), '');

      await expect(findPackageManagerByLockfile(tmpDir)).resolves.toBe('bun');
    });
  });

  it('detects npm-shrinkwrap.json (alternative npm lockfile)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await writeFile(joinPath(tmpDir, 'npm-shrinkwrap.json'), '');

      await expect(findPackageManagerByLockfile(tmpDir)).resolves.toBe('npm');
    });
  });

  it('matches cli-kit precedence when multiple lockfiles coexist (yarn wins over npm)', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await writeFile(joinPath(tmpDir, 'yarn.lock'), '');
      await writeFile(joinPath(tmpDir, 'package-lock.json'), '');

      await expect(findPackageManagerByLockfile(tmpDir)).resolves.toBe('yarn');
    });
  });
});
