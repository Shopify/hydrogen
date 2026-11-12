import {chmod, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test, expect} from '@playwright/test';
import {DevServer} from '../../fixtures/server';

const STORE_KEY = 'mockShop';
const STARTUP_ERROR =
  "Error: ENOTEMPTY: directory not empty, rmdir '.react-router/types'";

/**
 * A project whose `shopify` binary fails the way `shopify hydrogen dev` does
 * when it crashes during startup: an error on stderr, then exit code 1.
 */
async function createProjectWithCrashingCli() {
  const projectPath = await mkdtemp(
    path.join(tmpdir(), 'hydrogen-e2e-dev-server-'),
  );
  const binDirectory = path.join(projectPath, 'node_modules', '.bin');
  await mkdir(binDirectory, {recursive: true});
  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify({name: 'crashing-dev-server', private: true}),
  );

  const cliPath = path.join(binDirectory, 'shopify');
  await writeFile(cliPath, `#!/bin/sh\necho "${STARTUP_ERROR}" >&2\nexit 1\n`);
  await chmod(cliPath, 0o755);

  return projectPath;
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

  test.beforeEach(async () => {
    projectPath = await createProjectWithCrashingCli();
  });

  test.afterEach(async () => {
    await rm(projectPath, {recursive: true, force: true});
  });

  test('includes the CLI output that explains the crash', async () => {
    const message = await getStartupErrorMessage(
      new DevServer({projectPath, storeKey: STORE_KEY}),
    );

    expect(message).toContain('exited with code 1');
    expect(message).toContain(STARTUP_ERROR);
  });

  test('names the store instead of an unassigned server id', async () => {
    const message = await getStartupErrorMessage(
      new DevServer({projectPath, storeKey: STORE_KEY}),
    );

    expect(message).toContain(STORE_KEY);
    expect(message).not.toContain('undefined');
  });
});
