import '../onboarding/setup-template.mocks.js';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
  glob,
} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi} from 'vitest';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {getSkeletonSourceDir} from '../build.js';
import {runClassicCompilerBuild} from './build.js';
import {setupTemplate} from '../onboarding/index.js';

describe('Classic Remix Compiler build', () => {
  const outputMock = mockAndCaptureOutput();

  it('builds the project', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        template: 'classic-remix',
        routes: true,
        installDeps: true,
      });

      const templateFiles = await glob('**/*', {
        cwd: getSkeletonSourceDir()
          .replace('templates', 'examples')
          .replace('skeleton', 'classic-remix'),
        ignore: ['**/node_modules/**', '**/dist/**'],
        dot: false,
      });
      const resultFiles = await glob('**/*', {
        cwd: tmpDir,
        dot: false,
        ignore: ['**/node_modules/**'],
      });

      const nonAppFiles = templateFiles.filter(
        (item) => !item.startsWith('app/'),
      );

      expect(resultFiles).toEqual(expect.arrayContaining(nonAppFiles));
      expect(resultFiles).not.toContain('vite.config.ts');
      expect(resultFiles).not.toContain('env.d.ts');

      await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
        `"name": "example-classic-remix"`,
      );

      // --- BUILD
      outputMock.clear();
      vi.stubEnv('NODE_ENV', 'production');

      await expect(
        runClassicCompilerBuild({directory: tmpDir}),
      ).resolves.not.toThrow();

      const expectedBundlePath = 'dist/worker/index.js';

      const output = outputMock.output();
      expect(output).toMatch(expectedBundlePath);
      expect(
        fileExists(joinPath(tmpDir, expectedBundlePath)),
      ).resolves.toBeTruthy();

      const mb = Number(output.match(/index\.js\s+([\d.]+)\s+MB/)?.[1] || '');

      // Bundle size within 1 MB
      expect(mb).toBeGreaterThan(0);
      expect(mb).toBeLessThan(1);

      // Bundle analysis
      expect(output).toMatch('Complete analysis: file://');

      const clientAnalysisPath = 'dist/worker/client-bundle-analyzer.html';
      const workerAnalysisPath = 'dist/worker/worker-bundle-analyzer.html';

      await expect(
        fileExists(joinPath(tmpDir, clientAnalysisPath)),
      ).resolves.toBeTruthy();

      await expect(
        fileExists(joinPath(tmpDir, workerAnalysisPath)),
      ).resolves.toBeTruthy();

      await expect(
        readFile(joinPath(tmpDir, clientAnalysisPath)),
      ).resolves.toMatch(/globalThis\.METAFILE = '.+';/g);

      await expect(
        readFile(joinPath(tmpDir, workerAnalysisPath)),
      ).resolves.toMatch(/globalThis\.METAFILE = '.+';/g);
    });
  });
});
