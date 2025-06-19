import '../../lib/onboarding/setup-template.mocks.js';
import {mkdirSync, removeFile} from '@shopify/cli-kit/node/fs';
import {describe, it, expect, vi, beforeAll, afterAll} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runDev} from './dev.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import path from 'node:path';
import {rmSync, existsSync} from 'node:fs';

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
    console.log('Creating tmpDir', tmpDir);
    mkdirSync(tmpDir);
  });

  afterAll(async () => {
    console.log('Removing tmpDir', tmpDir);
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, {recursive: true});
    }
  });

  it('runs dev in a Vite project', async () => {
    console.log('tmpDir', tmpDir);
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
      // Wait for server to stabilize after env reload
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(outputMock.output()).toMatch(/View [^:]+? app:/i);

      // First test if worker is running
      console.log(`Fetching ${getUrl() + 'debug'}`);
      const debugResponse = await fetch(getUrl() + 'debug');
      console.log('Debug response status:', debugResponse.status);
      console.log('Debug response:', await debugResponse.text());

      const response = await fetch(getUrl());
      if (response.status !== 200) {
        const text = await response.text();
        console.log('Error response:', text);
      }
      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('text/html');
      await expect(response.text()).resolves.toMatch('Mock.shop');
    } finally {
      await close();
    }
  });
});
