import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {importLocal} from '../import-utils.js';
import {startWorkerdServer} from './workerd.js';

vi.mock('../import-utils.js');
afterEach(() => vi.restoreAllMocks());

it('registers cleanup before runtime readiness and disposes a failed startup once', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-worker-'));
  const workerPath = join(directory, 'server.js');
  await writeFile(
    workerPath,
    'export default {fetch() {return new Response("Hello")}};',
  );
  const dispose = vi.fn(async () => {});
  const error = new Error('Worker startup failed');
  let registeredClose: (() => Promise<unknown>) | undefined;
  vi.mocked(importLocal).mockResolvedValue({
    Response,
    createMiniOxygen: () => ({ready: Promise.reject(error), dispose}),
  } as any);
  try {
    await expect(
      startWorkerdServer({
        root: directory,
        buildPathClient: directory,
        buildPathWorkerFile: workerPath,
        env: {},
        registerCleanup: (close) => {
          registeredClose = close;
        },
      }),
    ).rejects.toBe(error);
    expect(registeredClose).toBeDefined();
    await registeredClose!();
    expect(dispose).toHaveBeenCalledTimes(1);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
