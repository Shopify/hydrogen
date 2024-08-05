import '../onboarding/setup-template.mocks.js';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi} from 'vitest';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runClassicCompilerDev} from './dev.js';
import {setupTemplate} from '../onboarding/index.js';

describe('Classic Remix Compiler dev', () => {
  const outputMock = mockAndCaptureOutput();

  it('runs dev in project', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        template: 'classic-remix',
        routes: true,
        installDeps: true,
      });

      await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
        `"name": "example-classic-remix"`,
      );

      // --- DEV
      outputMock.clear();
      vi.stubEnv('NODE_ENV', 'development');

      const {close, getUrl} = await runClassicCompilerDev({
        path: tmpDir,
        disableVirtualRoutes: true,
        disableVersionCheck: true,
        cliConfig: {} as any,
        envFile: '.env',
      });

      try {
        await vi.waitFor(() => expect(outputMock.output()).toMatch('success'), {
          timeout: 5000,
        });

        expect(outputMock.output()).toMatch(/View [^:]+? app:/i);

        await expect(
          fileExists(joinPath(tmpDir, 'dist', 'worker', 'index.js')),
        ).resolves.toBeTruthy();

        const response = await fetch(getUrl());
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toEqual('text/html');
        await expect(response.text()).resolves.toMatch('Mock.shop');
      } finally {
        await close();
      }
    });
  });
});
