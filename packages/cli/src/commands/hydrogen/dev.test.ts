import '../../lib/onboarding/setup-template.mocks.js';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runDev} from './dev.js';
import {setupTemplate} from '../../lib/onboarding/index.js';

describe('dev', () => {
  const outputMock = mockAndCaptureOutput();

  it('runs dev in a Vite project', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: true,
        language: 'ts',
        i18n: 'subfolders',
        routes: true,
        installDeps: true,
      });

      // Clear previous success messages
      outputMock.clear();
      vi.stubEnv('NODE_ENV', 'development');

      const {close, getUrl} = await runDev({
        path: tmpDir,
        disableVirtualRoutes: true,
        disableVersionCheck: true,
        cliConfig: {} as any,
        envFile: '.env',
      });

      try {
        await vi.waitFor(
          () => expect(outputMock.output()).toMatch(/View [^:]+? app:/i),
          {timeout: 5000},
        );

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
