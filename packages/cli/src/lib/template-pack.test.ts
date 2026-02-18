import {cp, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {getSkeletonSourceDir} from './build.js';
import {replaceWorkspaceProtocolVersions} from './template-pack.js';

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

describe('replaceWorkspaceProtocolVersions', () => {
  it('replaces workspace protocol versions in copied templates', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const sourceTemplateDir = getSkeletonSourceDir();
      const copiedTemplateDir = join(tmpDir, 'skeleton-copy');

      await cp(sourceTemplateDir, copiedTemplateDir, {recursive: true});

      const copiedPackageJsonPath = join(copiedTemplateDir, 'package.json');
      const copiedPackageJsonBefore = JSON.parse(
        await readFile(copiedPackageJsonPath, 'utf8'),
      ) as Record<string, Record<string, string> | undefined>;

      // Simulate a dependency managed through pnpm catalog.
      copiedPackageJsonBefore.dependencies ??= {};
      copiedPackageJsonBefore.dependencies['@shopify/hydrogen'] = 'catalog:';

      await writeFile(
        copiedPackageJsonPath,
        `${JSON.stringify(copiedPackageJsonBefore, null, 2)}\n`,
      );

      await replaceWorkspaceProtocolVersions({
        sourceTemplateDir,
        targetTemplateDir: copiedTemplateDir,
      });

      const copiedPackageJson = JSON.parse(
        await readFile(copiedPackageJsonPath, 'utf8'),
      ) as Record<string, Record<string, string> | undefined>;

      for (const section of DEPENDENCY_SECTIONS) {
        const deps = copiedPackageJson[section];
        if (!deps) continue;

        for (const version of Object.values(deps)) {
          expect(version.startsWith('workspace:')).toBe(false);
          expect(version.startsWith('catalog:')).toBe(false);
        }
      }
    });
  });
});
