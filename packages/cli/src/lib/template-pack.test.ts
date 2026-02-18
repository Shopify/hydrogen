import {cp, readFile} from 'node:fs/promises';
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
      await replaceWorkspaceProtocolVersions({
        sourceTemplateDir,
        targetTemplateDir: copiedTemplateDir,
      });

      const copiedPackageJson = JSON.parse(
        await readFile(join(copiedTemplateDir, 'package.json'), 'utf8'),
      ) as Record<string, Record<string, string> | undefined>;

      for (const section of DEPENDENCY_SECTIONS) {
        const deps = copiedPackageJson[section];
        if (!deps) continue;

        for (const version of Object.values(deps)) {
          expect(version.startsWith('workspace:')).toBe(false);
        }
      }
    });
  });
});
