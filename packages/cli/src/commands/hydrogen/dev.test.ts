import '../../lib/onboarding/setup-template.mocks.js';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';
import {afterEach, expect, it, vi} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {runDev} from './dev.js';
import {runDevSession} from '../../lib/dev-session.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import {resetAllLogs} from '../../lib/log.js';

afterEach(() => {
  resetAllLogs();
  vi.unstubAllEnvs();
});

it('runs a Vite project with session ownership, URLs and filtered watcher logs', async () => {
  const outputMock = mockAndCaptureOutput();
  await inTemporaryDirectory(async (directory) => {
    await setupTemplate({
      path: directory,
      git: true,
      language: 'ts',
      i18n: 'subfolders',
      installDeps: true,
    });

    outputMock.clear();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('REMIX_TYPEGEN', 'false');
    const controller = new AbortController();
    const changedFile = join(directory, 'app', 'session-change.txt');
    await writeFile(changedFile, 'before');
    const logDirectory = join(directory, '.shopify', 'dev');
    const sessionLog = async () => {
      const files = await readdir(logDirectory);
      const logFile = files.find((file) => file.endsWith('.jsonl'))!;
      return readFile(join(logDirectory, logFile), 'utf8');
    };
    await runDevSession(
      {
        command: 'hydrogen dev',
        directory,
        envFile: '.env',
        signal: controller.signal,
      },
      async (session) => {
        try {
          const {getUrl} = await runDev({
            path: directory,
            disableVirtualRoutes: true,
            disableVersionCheck: true,
            cliConfig: {} as any,
            envFile: '.env',
            session,
          });
          const url = getUrl();
          const [instance] = await listDevInstances(directory);
          expect(instance).toMatchObject({
            status: 'running',
            details: {urls: expect.arrayContaining([url])},
          });
          await vi.waitFor(
            () => expect(outputMock.output()).toMatch(/View [^:]+? app:/i),
            {timeout: 15000},
          );

          const rootResponse = await fetch(url);
          expect(rootResponse.status).toBe(200);
          expect(rootResponse.headers.get('content-type')).toBe('text/html');
          await expect(rootResponse.text()).resolves.toContain('Mock.shop');

          await writeFile(changedFile, 'after');
          await vi.waitFor(async () => {
            expect(await sessionLog()).toContain(
              `File changed: ${changedFile}`,
            );
          });
          const sessionFile = join(logDirectory, 'watcher-test.json');
          await writeFile(sessionFile, 'before');
          await writeFile(sessionFile, 'after');

          const faviconResponse = await fetch(url + 'app/assets/favicon.svg');
          expect(faviconResponse.status).toBe(200);
          expect(faviconResponse.headers.get('content-type')).toBe(
            'image/svg+xml',
          );
          await expect(faviconResponse.arrayBuffer()).resolves.toBeTruthy();
        } finally {
          controller.abort();
        }
      },
    );
    expect(await listDevInstances(directory)).toHaveLength(0);
    const records = (await sessionLog())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(
      records.filter(({message}) => message.startsWith('File changed:')),
    ).not.toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('/.shopify/dev/'),
      }),
    );
  });
});
