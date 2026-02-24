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

function getCatalogVersion(workspaceConfig: string, packageName: string) {
  const catalogSection = workspaceConfig.split('\ncatalog:\n')[1];
  if (!catalogSection) {
    throw new Error(
      'Expected pnpm-workspace.yaml to include a catalog section.',
    );
  }

  const escapedPackageName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = catalogSection.match(
    new RegExp(
      `^\\s*${escapedPackageName}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`,
      'm',
    ),
  );

  if (!match?.[1]) {
    throw new Error(`Expected pnpm catalog entry for ${packageName}.`);
  }

  return match[1];
}

describe('replaceWorkspaceProtocolVersions', () => {
  it('replaces workspace protocol versions in copied templates', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const sourceTemplateDir = getSkeletonSourceDir();
      const copiedTemplateDir = join(tmpDir, 'skeleton-copy');
      const workspaceConfigPath = join(
        sourceTemplateDir,
        '..',
        '..',
        'pnpm-workspace.yaml',
      );

      await cp(sourceTemplateDir, copiedTemplateDir, {recursive: true});

      const copiedPackageJsonPath = join(copiedTemplateDir, 'package.json');
      const workspaceConfig = await readFile(workspaceConfigPath, 'utf8');
      const expectedReactVersion = getCatalogVersion(workspaceConfig, 'react');
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

      expect(copiedPackageJson.dependencies?.react).toBe(expectedReactVersion);
    });
  });

  it('throws a clear error when a workspace dependency is missing from the packed manifest', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const sourceTemplateDir = getSkeletonSourceDir();
      const copiedTemplateDir = join(tmpDir, 'skeleton-copy');

      await cp(sourceTemplateDir, copiedTemplateDir, {recursive: true});

      const copiedPackageJsonPath = join(copiedTemplateDir, 'package.json');
      const copiedPackageJsonBefore = JSON.parse(
        await readFile(copiedPackageJsonPath, 'utf8'),
      ) as Record<string, Record<string, string> | undefined>;

      copiedPackageJsonBefore.dependencies ??= {};
      copiedPackageJsonBefore.dependencies['@shopify/does-not-exist'] =
        'workspace:*';

      await writeFile(
        copiedPackageJsonPath,
        `${JSON.stringify(copiedPackageJsonBefore, null, 2)}\n`,
      );

      await expect(
        replaceWorkspaceProtocolVersions({
          sourceTemplateDir,
          targetTemplateDir: copiedTemplateDir,
        }),
      ).rejects.toThrow(
        'Unable to resolve @shopify/does-not-exist from dependencies in packed template manifest.',
      );
    });
  });

  it('throws a clear error when a catalog dependency is missing from the packed manifest', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const sourceTemplateDir = getSkeletonSourceDir();
      const copiedTemplateDir = join(tmpDir, 'skeleton-copy');

      await cp(sourceTemplateDir, copiedTemplateDir, {recursive: true});

      const copiedPackageJsonPath = join(copiedTemplateDir, 'package.json');
      const copiedPackageJsonBefore = JSON.parse(
        await readFile(copiedPackageJsonPath, 'utf8'),
      ) as Record<string, Record<string, string> | undefined>;

      copiedPackageJsonBefore.dependencies ??= {};
      copiedPackageJsonBefore.dependencies['@shopify/catalog-does-not-exist'] =
        'catalog:';

      await writeFile(
        copiedPackageJsonPath,
        `${JSON.stringify(copiedPackageJsonBefore, null, 2)}\n`,
      );

      await expect(
        replaceWorkspaceProtocolVersions({
          sourceTemplateDir,
          targetTemplateDir: copiedTemplateDir,
        }),
      ).rejects.toThrow(
        'Unable to resolve @shopify/catalog-does-not-exist from dependencies in packed template manifest.',
      );
    });
  });
});
