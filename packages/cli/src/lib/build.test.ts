import {describe, it, expect} from 'vitest';
import {pathToFileURL} from 'node:url';
import {inTemporaryDirectory, mkdir} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {detectHydrogenMonorepo, getMonorepoPackagesPath} from './build.js';

// Mirrors the location of this file inside the monorepo, since monorepo
// detection resolves `packages/` relative to the module that asks for it.
const MODULE_PATH_IN_REPO = ['packages', 'cli', 'src', 'lib', 'build.ts'];

function moduleUrlFor(repoRoot: string) {
  return pathToFileURL(joinPath(repoRoot, ...MODULE_PATH_IN_REPO));
}

async function createFakeMonorepo(repoRoot: string) {
  await mkdir(joinPath(repoRoot, ...MODULE_PATH_IN_REPO.slice(0, -1)));
  await mkdir(joinPath(repoRoot, 'templates', 'skeleton'));
}

describe('monorepo detection', () => {
  it('detects the monorepo when the path contains a space', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      // The space is what regressed: `URL.pathname` percent-encodes it, and
      // the encoded path does not exist on disk.
      const repoRoot = joinPath(tmpDir, 'Open Source', 'hydrogen');
      await createFakeMonorepo(repoRoot);

      expect(detectHydrogenMonorepo(moduleUrlFor(repoRoot))).toBe(true);
      expect(getMonorepoPackagesPath(moduleUrlFor(repoRoot))).toContain(
        'Open Source',
      );
    });
  });

  it('detects the monorepo when the path contains no space', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const repoRoot = joinPath(tmpDir, 'hydrogen');
      await createFakeMonorepo(repoRoot);

      expect(detectHydrogenMonorepo(moduleUrlFor(repoRoot))).toBe(true);
    });
  });

  it('does not detect a monorepo without templates/skeleton', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const repoRoot = joinPath(tmpDir, 'Open Source', 'not-hydrogen');
      await mkdir(joinPath(repoRoot, ...MODULE_PATH_IN_REPO.slice(0, -1)));

      expect(detectHydrogenMonorepo(moduleUrlFor(repoRoot))).toBe(false);
    });
  });
});
