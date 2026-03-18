import '../../lib/onboarding/setup-template.mocks.js';
import {mkdirSync} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi, beforeAll, afterAll} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runDev} from './dev.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import path from 'node:path';
import {rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';

describe('dev', () => {
  const outputMock = mockAndCaptureOutput();

  let tmpDirInstance: number = 0;
  let tmpDir: string;

  beforeAll(async () => {
    // Should be the root of the hydrogen repository.
    const projectRootDir = path.join(__dirname, '..', '..', '..', '..', '..');
    tmpDir = path.join(projectRootDir, `test-project-dev-${tmpDirInstance++}`);
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, {recursive: true});
    }
    mkdirSync(tmpDir);
  });

  afterAll(async () => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, {recursive: true});
    }
  });

  it('runs dev in a Vite project', async () => {
    await setupTemplate({
      path: tmpDir,
      git: true,
      language: 'ts',
      i18n: 'subfolders',
      installDeps: true,
    });

    // Clear previous success messages
    outputMock.clear();
    vi.stubEnv('NODE_ENV', 'development');
    // Disable React Router typegen during tests to avoid permission errors
    vi.stubEnv('REMIX_TYPEGEN', 'false');

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
        {timeout: 15000}, // Increased timeout to account for readiness
      );

      const rootResponse = await fetch(getUrl());
      expect(rootResponse.status).toEqual(200);
      expect(rootResponse.headers.get('content-type')).toEqual('text/html');
      await expect(rootResponse.text()).resolves.toMatch('Mock.shop');

      const faviconResponse = await fetch(getUrl() + 'app/assets/favicon.svg');
      expect(faviconResponse.status).toEqual(200);
      expect(faviconResponse.headers.get('content-type')).toEqual(
        'image/svg+xml',
      );
      await expect(faviconResponse.arrayBuffer()).resolves.toBeTruthy();
    } finally {
      await close();
    }
  });
});
