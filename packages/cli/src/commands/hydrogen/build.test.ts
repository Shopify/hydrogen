import whyIsNodeRunning from 'why-is-node-running';
import '../../lib/onboarding/setup-template.mocks.js';
import {
  readFile,
  fileExists,
  inTemporaryDirectory,
} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi} from 'vitest';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runBuild} from './build.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import {BUNDLE_ANALYZER_HTML_FILE} from '../../lib/bundle/analyzer.js';

describe('build', () => {
  const outputMock = mockAndCaptureOutput();

  it('builds a Vite project', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
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
      console.log('it apparently resolves not to throw');

      const runBuildResult = await runBuildResultPromise;
      console.log('After closing the runBuildResult');

      const expectedBundlePath = 'dist/server/index.js';

      const output = outputMock.output();
      console.log('output', output);
      console.log('Mid-point');
      expect(output).toMatch(expectedBundlePath);
      console.log('After first output match');
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

      await runBuildResult.close();

      console.log('After all the checks');
    });
    console.log('why is node running?');
    whyIsNodeRunning();
  });
});
