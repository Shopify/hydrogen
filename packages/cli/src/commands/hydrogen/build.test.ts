import '../../lib/onboarding/setup-template.mocks.js';
import {
  readFile,
  fileExists,
  inTemporaryDirectory,
  removeFile,
} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi, beforeAll, afterAll} from 'vitest';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runBuild} from './build.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import {BUNDLE_ANALYZER_HTML_FILE} from '../../lib/bundle/analyzer.js';
import path from 'node:path';
import {mkdirSync} from 'node:fs';

describe('build', () => {
  const outputMock = mockAndCaptureOutput();

  let tmpDir: string;

  beforeAll(async () => {
    // Should be the root of the hydrogen repository.
    const projectRootDir = path.join(__dirname, '..', '..', '..', '..', '..');
    // Use timestamp to ensure unique directory name
    tmpDir = path.join(
      projectRootDir,
      `test-project-build-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    mkdirSync(tmpDir, {recursive: true});
  });

  afterAll(async () => {
    await removeFile(tmpDir);
  });

  it('builds a Vite project', async () => {
    await setupTemplate({
      path: tmpDir,
      git: true,
      language: 'ts',
      i18n: 'subfolders',
      routes: true,
      installDeps: true,
    });

    outputMock.clear();
    vi.stubEnv('NODE_ENV', 'production');

    const runBuildResultPromise = runBuild({
      directory: tmpDir,
      bundleStats: true,
    });

    await expect(runBuildResultPromise).resolves.not.toThrow();

    const runBuildResult = await runBuildResultPromise;

    const expectedBundlePath = 'dist/server/index.js';

    const output = outputMock.output();
    expect(output).toMatch(expectedBundlePath);
    expect(output).toMatch('building for productio');
    expect(output).toMatch('dist/client/assets/root-');
    expect(output).toMatch('building SSR bundle for productio');
    expect(
      fileExists(joinPath(tmpDir, expectedBundlePath)),
    ).resolves.toBeTruthy();

    const kB = Number(
      output.match(/dist\/server\/index\.js\s+([\d.]+)\s+kB/)?.[1] || '',
    );

    // Bundle size within 1 MB
    expect(kB).toBeGreaterThan(0);
    expect(kB).toBeLessThan(1024);

    // Bundle analysis
    expect(output).toMatch('Complete analysis: file://');

    await expect(
      readFile(joinPath(tmpDir, 'dist', 'server', BUNDLE_ANALYZER_HTML_FILE)),
    ).resolves.toMatch(/globalThis\.METAFILE = '.+';/g);

    // Close build result resources.
    await runBuildResult.close();
  }, 60000); // 60 second timeout for build
});
