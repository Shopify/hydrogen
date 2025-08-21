import './setup-template.mocks.js';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import glob from 'fast-glob';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory, readFile} from '@shopify/cli-kit/node/fs';
import {setupTemplate} from './index.js';
import {getSkeletonSourceDir} from '../build.js';
import {readAndParsePackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {joinPath} from '@shopify/cli-kit/node/path';

describe('remote templates', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    outputMock.clear();
  });

  it('throws for unknown templates', async () => {
    const processExit = vi
      .spyOn(process, 'exit')
      .mockImplementationOnce((() => {}) as any);

    await inTemporaryDirectory(async (tmpDir) => {
      await expect(
        setupTemplate({
          path: tmpDir,
          git: false,
          language: 'ts',
          template: 'missing-template',
        }),
      ).resolves.toBeUndefined();
    });

    // The error message is printed asynchronously
    await vi.waitFor(() => expect(outputMock.error()).toMatch('--template'));

    expect(processExit).toHaveBeenCalledWith(1);

    processExit.mockRestore();
  });

  it('handles unknown templates without ENOENT race condition', async () => {
    // This test verifies the fix for a race condition in template setup.
    // The race condition occurred when template download started before
    // handleProjectLocation completed, causing ENOENT errors when the abort
    // handler tried to clean up a directory still being accessed.

    const processExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as any);

    // Run multiple iterations - should never throw unhandled ENOENT
    // If the race condition occurs, Vitest will catch the unhandled rejection
    for (let i = 0; i < 3; i++) {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          setupTemplate({
            path: tmpDir,
            git: false,
            language: 'ts',
            template: `nonexistent-template-${i}`,
          }),
        ).resolves.toBeUndefined();
      });

      // Verify proper error handling occurred
      await vi.waitFor(() => expect(outputMock.error()).toMatch('--template'));
      outputMock.clear();
    }

    expect(processExit).toHaveBeenCalled();
    processExit.mockRestore();
  });

  it('creates basic projects', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        template: 'infinite-scroll',
      });

      const resultFiles = await glob('**/*', {cwd: tmpDir});

      expect(resultFiles).toContain('app/root.tsx');
      expect(resultFiles).toContain('app/entry.client.tsx');
      expect(resultFiles).toContain('app/entry.server.tsx');
      expect(resultFiles).toContain('app/components/PageLayout.tsx');
      expect(resultFiles).toContain('app/routes/_index.tsx');

      const pkgJsonPromise = readFile(`${tmpDir}/package.json`);
      await expect(pkgJsonPromise).resolves.not.toThrow();
      const pkgJsonString = await pkgJsonPromise;

      expect(() => JSON.parse(pkgJsonString)).not.toThrow();
      expect(pkgJsonString).toMatch(`"name": "example-infinite-scroll"`);
      expect(pkgJsonString).not.toMatch(`"@shopify/cli-hydrogen"`);

      const output = outputMock.info();
      expect(output).toMatch('success');
      expect(output).not.toMatch('warning');
      expect(output).not.toMatch('Routes');
      expect(output).toMatch(/Language:\s*TypeScript/);
      expect(output).toMatch('Next steps');
      expect(output).toMatch(
        // Output contains banner characters. USe [^\w]*? to match them.
        /Run `cd .*? &&[^\w]*?npm[^\w]*?install[^\w]*?&&[^\w]*?npm[^\w]*?run[^\w]*?dev`/ims,
      );
    });
  });

  it('applies diff for examples', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const exampleName = 'third-party-queries-caching';

      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        template: exampleName,
      });

      const templatePath = getSkeletonSourceDir();
      const examplePath = templatePath
        .replace('templates', 'examples')
        .replace('skeleton', exampleName);

      // --- Test file diff
      const ignore = ['**/node_modules/**', '**/dist/**'];
      const resultFiles = await glob('**/*', {ignore, cwd: tmpDir});
      const exampleFiles = await glob('**/*', {ignore, cwd: examplePath});
      const templateFiles = (
        await glob('**/*', {ignore, cwd: templatePath})
      ).filter((item) => !item.endsWith('CHANGELOG.md'));

      expect(resultFiles).toEqual(
        expect.arrayContaining([
          ...new Set([...templateFiles, ...exampleFiles]),
        ]),
      );

      // --- Test package.json merge
      const templatePkgJson = await readAndParsePackageJson(
        `${templatePath}/package.json`,
      );
      const examplePkgJson = await readAndParsePackageJson(
        `${examplePath}/package.json`,
      );
      const resultPkgJson = await readAndParsePackageJson(
        `${tmpDir}/package.json`,
      );

      expect(resultPkgJson.name).toMatch(exampleName);

      // The example's scripts should override the template's scripts
      // but the --diff flag is removed by applyTemplateDiff
      const expectedScripts = {
        ...templatePkgJson.scripts,
        ...examplePkgJson.scripts,
      };

      // Remove --diff flag from build, dev, and preview scripts as applyTemplateDiff does
      for (const key of ['build', 'dev', 'preview']) {
        if (expectedScripts[key] && typeof expectedScripts[key] === 'string') {
          expectedScripts[key] = expectedScripts[key].replace(/\s+--diff/, '');
        }
      }

      expect(resultPkgJson.scripts).toEqual(expectedScripts);

      const expectedDeps = {
        ...templatePkgJson.dependencies,
        ...examplePkgJson.dependencies,
      };

      expect(resultPkgJson.dependencies).toEqual(
        expect.objectContaining(expectedDeps),
      );
      expect(resultPkgJson.devDependencies).toEqual(
        expect.objectContaining({
          ...templatePkgJson.devDependencies,
          ...examplePkgJson.devDependencies,
        }),
      );
      expect(resultPkgJson.peerDependencies).toEqual(
        expect.objectContaining({
          ...templatePkgJson.peerDependencies,
          ...examplePkgJson.peerDependencies,
        }),
      );

      // --- Keeps original tsconfig.json
      expect(await readFile(joinPath(templatePath, 'tsconfig.json'))).toEqual(
        await readFile(joinPath(tmpDir, 'tsconfig.json')),
      );
    });
  });

  it('transpiles projects to JS', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'js',
        template: 'infinite-scroll',
      });

      const templatePath = getSkeletonSourceDir();

      const templateFiles = await glob('**/*', {
        cwd: templatePath,
        ignore: ['**/node_modules/**', '**/dist/**', 'CHANGELOG.md'],
      });
      const resultFiles = await glob('**/*', {cwd: tmpDir});

      expect(resultFiles).toEqual(
        expect.arrayContaining(
          templateFiles.map((item) =>
            item
              .replace(/(?<!\.d)\.ts(x)?$/, '.js$1')
              .replace(/tsconfig\.json$/, 'jsconfig.json'),
          ),
        ),
      );

      // No types but JSDocs:
      await expect(readFile(`${tmpDir}/server.js`)).resolves.toMatch(
        /export default {\n\s+\/\*\*.*?\*\/\n\s+async fetch\(\s*request,\s*env,\s*executionContext,?\s*\)/s,
      );

      const output = outputMock.info();
      expect(output).toMatch('success');
      expect(output).not.toMatch('warning');
      expect(output).toMatch(/Language:\s*JavaScript/);
    });
  });
});
