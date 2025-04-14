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
        mockShop: true,
      });

      // Clear previous success messages
      outputMock.clear();
      vi.stubEnv('NODE_ENV', 'development');

      const {close, getUrl} = await runDev({
        path: tmpDir,
        port: Math.floor(Math.random() * (65535 - 3050) + 3050),
        disableVirtualRoutes: true,
        disableVersionCheck: true,
        cliConfig: {} as any,
        envFile: '.env',
      });

      try {
        await vi.waitFor(
          async () => {
            const output = outputMock.output();
            expect(output).toMatch(/View [^:]+? app:/i);
            const devUrl = getUrl();
            const response = await fetch(devUrl);
            expect(response.status).toBe(200);
          },
          {timeout: 8000},
        );
      } finally {
        await close();
      }
    });
  });
});
