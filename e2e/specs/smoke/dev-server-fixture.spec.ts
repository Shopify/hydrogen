import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test, expect} from '@playwright/test';
import {DevServer, MAX_STARTUP_ATTEMPTS} from '../../fixtures/server';

const STORE_KEY = 'mockShop';
const STARTUP_ERROR =
  "Error: ENOTEMPTY: directory not empty, rmdir '.react-router/types'";
// The real CLI prints a stack trace after the error, so the error is not the
// last line of output.
const STACK_FRAME = '    at watch (vite.js:1392:3)';
const FAKE_APP_PORT = 4321;
const ATTEMPTS_FILE = 'attempts.log';

/**
 * Creates a project whose `shopify` binary stands in for
 * `shopify hydrogen dev`. Each run appends to `attempts.log`, so tests can
 * count startups. The first `crashCount` runs crash the way the real CLI does
 * (an error and its stack on stderr, then exit code 1); later runs report
 * ready and stay alive until stopped.
 */
async function createProjectWithFakeCli(crashCount: number) {
  const projectPath = await mkdtemp(
    path.join(tmpdir(), 'hydrogen-e2e-dev-server-'),
  );
  const binDirectory = path.join(projectPath, 'node_modules', '.bin');
  await mkdir(binDirectory, {recursive: true});
  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify({name: 'fake-dev-server', private: true}),
  );

  const cliPath = path.join(binDirectory, 'shopify');
  await writeFile(
    cliPath,
    `#!/bin/sh
echo attempt >> ${ATTEMPTS_FILE}
if [ "$(wc -l < ${ATTEMPTS_FILE})" -le ${crashCount} ]; then
  echo "${STARTUP_ERROR}" >&2
  echo "${STACK_FRAME}" >&2
  exit 1
fi
echo "View app: http://localhost:${FAKE_APP_PORT}"
exec sleep 300
`,
  );
  await chmod(cliPath, 0o755);

  return projectPath;
}

async function countStartupAttempts(projectPath: string) {
  const attempts = await readFile(
    path.join(projectPath, ATTEMPTS_FILE),
    'utf8',
  );
  return attempts.trim().split('\n').length;
}

async function getStartupErrorMessage(server: DevServer) {
  try {
    await server.start();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('Expected the dev server to fail during startup');
}

test.describe('DevServer startup failures', () => {
  let projectPath: string;
  const servers: DevServer[] = [];

  function createServer() {
    const server = new DevServer({projectPath, storeKey: STORE_KEY});
    servers.push(server);
    return server;
  }

  test.afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.stop()));
    await rm(projectPath, {recursive: true, force: true});
  });

  test.describe('when every startup attempt crashes', () => {
    test.beforeEach(async () => {
      projectPath = await createProjectWithFakeCli(MAX_STARTUP_ATTEMPTS);
    });

    test('includes the CLI output that explains the crash', async () => {
      const message = await getStartupErrorMessage(createServer());

      expect(message).toContain('exited with code 1');
      expect(message).toContain(STARTUP_ERROR);
    });

    test('names the store instead of an unassigned server id', async () => {
      const message = await getStartupErrorMessage(createServer());

      expect(message).toContain(STORE_KEY);
      expect(message).not.toContain('undefined');
    });

    test('gives up after the maximum number of attempts', async () => {
      await getStartupErrorMessage(createServer());

      expect(await countStartupAttempts(projectPath)).toBe(
        MAX_STARTUP_ATTEMPTS,
      );
    });
  });

  test('retries a crash that happens before the server is ready', async () => {
    projectPath = await createProjectWithFakeCli(1);
    const server = createServer();

    await server.start();

    expect(server.getUrl()).toBe(`http://localhost:${FAKE_APP_PORT}`);
    expect(await countStartupAttempts(projectPath)).toBe(2);
  });

  test('logs the error, not a stack frame, when it retries', async () => {
    projectPath = await createProjectWithFakeCli(1);
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await createServer().start();
    } finally {
      console.log = originalLog;
    }

    const retryLog = logs.find((log) => log.includes('Retrying'));
    expect(retryLog).toContain(STARTUP_ERROR);
  });
});
